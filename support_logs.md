
# PayTEF Cloud API Integration Logs
# Date: 2026-02-16
# Context: Integration of Kiosk App with PayTEF Cloud API (PAX A35)

## Summary of Issue
We are attempting to authenticate against `https://cloud.api.paytef.es` using the provided credentials.
We have attempted two authentication methods:
1. **Standard JSON Body** (as per typical REST APIs).
2. **AWS Signature V4** (suggested by initial 403 errors).

In both cases, we receive **403 Forbidden**. The AWS SigV4 error explicitly states "The security token included in the request is invalid", indicating the provided credentials are not authorized for the `execute-api` service in `eu-west-3`.

---

## Test 1: JSON Body Authentication (User Flow)
**Request:**
POST https://cloud.api.paytef.es/auth/token
Content-Type: application/json

Payload:
{
  "accessKey": "MS4yaGc1",
  "secretKey": "nc3Xhhmk3gdQVPwzAKShvrp9ORWaBRVHM3uKUElO",
  "keyID": "Onptzs1I2BSKxTFEGfja1dqVQqe6U="
}

**Response:**
HTTP 403 Forbidden
Body:
{
  "message": "Missing Authentication Token"
}

*Analysis: The API Gateway rejects the request before it reaches the endpoint, implying it expects a simpler Auth header or a SigV4 signature.*

---

## Test 2: AWS Signature V4 Authentication (Derived Flow)
**Configuration:**
- Region: `eu-west-3` (Auto-detected via error messages)
- Service: `execute-api`
- Algorithm: `AWS4-HMAC-SHA256`
- Key ID Used: `Onptzs1I2BSKxTFEGfja1dqVQqe6U=` (Also tested `MS4yaGc1`)

**Request:**
POST https://cloud.api.paytef.es/auth/token
Headers:
Authorization: AWS4-HMAC-SHA256 Credential=Onptzs1I2BSKxTFEGfja1dqVQqe6U=/20260216/eu-west-3/execute-api/aws4_request, SignedHeaders=host;x-amz-date, Signature=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
X-Amz-Date: 20260216T142000Z

**Response:**
HTTP 403 Forbidden
Body:
{
  "message": "The security token included in the request is invalid."
}

*Analysis: The AWS API Gateway correctly identifies the signature format but rejects the specific Key ID provided. This typically indicates that the IAM User / Access Key is not active or not associated with the correct Usage Plan in AWS.*

---

## Conclusion for Support
The credentials provided appear to be valid in format but are **systematically rejected by the AWS API Gateway Authorizer**.
We request:
1. Confirmation that `Onptzs1I2BSKxTFEGfja1dqVQqe6U=` is the correct **AWS Access Key ID**.
2. Confirmation that this key is enabled for the `eu-west-3` region.
3. If SigV4 is NOT required, please provide the exact expected `Authorization` header format (e.g., `Basic` or `Bearer` with a specific pre-shared token).

---

## Test 3: Corrected Endpoint (/authorize/)
**Request:**
POST https://cloud.api.paytef.es/authorize/
Content-Type: application/json

Payload:
{
  "accessKey": "MS4yaGc1",
  "secretKey": "nc3Xhhmk3gdQVPwzAKShvrp9ORWaBRVHM3uKUElO"
}

**Response:**
HTTP 403 Forbidden
Body:
{
  "error": {
    "code": "unhandledError",
    "description": "Authorization token is disabled"
  }
}

*Analysis: The error message changed from "Missing Authentication Token" to "Authorization token is disabled". This confirms that `/authorize/` is the correct endpoint (or at least reachable), but the credentials/token provided are either disabled or invalid for this usage.*
HTTP 403 Forbidden
Body:
{
  "error": {
    "code": "unhandledError",
    "description": "NullPointerException - Parameter specified as non-null is null: method ...ApiTxnStartInfo$Companion.newFor, parameter opType"
  },
  "version": "2025.08.072222"
}

*Analysis: Authentication works. Pinpad ID "02290357044" seems potentially valid (or at least passed initial checks), but the server requires an `opType` parameter which we are unable to guess the correct JSON field name for.*

---

## Test 6: Transaction Start (SUCCESS)
**Request:**
POST https://cloud.api.paytef.es/transaction/start
Payload:
{
  "language": "es",
  "pinpad": "02290357044",
  "executeOptions": {
    "method": "polling"
  },
  "opType": "sale",
  "requestedAmount": 200,
  "transactionReference": "Test Transaction"
}

**Response:**
HTTP 200 OK
Body:
{
  "info": {
    "message": "Transacción en proceso",
    "opType": "sale",
    "started": true
  },
  "version": "2025.08.072222"
}

*Analysis: **SUCCESS**. The transaction has been successfully initiated on the Cloud API using the "Paytef Android" interface format.*
