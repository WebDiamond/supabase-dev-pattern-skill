# AWS S3 — Configurazione Sicura
# ============================================================
# Esegui questi comandi con AWS CLI configurato (aws configure)
# oppure applica le policy dalla console AWS IAM/S3.

# ── 1. Crea il bucket privato ─────────────────────────────────────────────
# Sostituisci BUCKET_NAME con il nome del tuo bucket (unico globalmente)
# Sostituisci REGION con la tua regione (es. eu-south-1, eu-west-1)

BUCKET_NAME="mio-app-files-privati"
REGION="eu-south-1"

aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION

# ── 2. Blocca TUTTO l'accesso pubblico (fondamentale) ────────────────────
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# ── 3. Abilita versioning (rollback in caso di cancellazione accidentale) ─
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

# ── 4. Abilita crittografia server-side di default ────────────────────────
aws s3api put-bucket-encryption \
  --bucket $BUCKET_NAME \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      },
      "BucketKeyEnabled": true
    }]
  }'

# ── 5. Lifecycle rule — elimina file temp dopo 24h ────────────────────────
# (opzionale — per la cartella temp/ usata da presigned upload)
aws s3api put-bucket-lifecycle-configuration \
  --bucket $BUCKET_NAME \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "CleanupTempFiles",
      "Status": "Enabled",
      "Filter": { "Prefix": "temp/" },
      "Expiration": { "Days": 1 }
    },
    {
      "ID": "CleanupOldVersions",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 }
    }]
  }'

# ── 6. CORS (se il client carica direttamente con presigned URL) ──────────
aws s3api put-bucket-cors \
  --bucket $BUCKET_NAME \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedHeaders": ["Content-Type", "Content-Disposition"],
      "AllowedMethods": ["PUT"],
      "AllowedOrigins": [
        "http://localhost:5173",
        "https://tuodominio.com"
      ],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }]
  }'

# ── 7. Policy bucket — forza crittografia e nega HTTP plain ──────────────
# Sostituisci ACCOUNT_ID con il tuo AWS Account ID
ACCOUNT_ID="123456789012"

aws s3api put-bucket-policy \
  --bucket $BUCKET_NAME \
  --policy "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
      {
        \"Sid\": \"DenyNonEncryptedUpload\",
        \"Effect\": \"Deny\",
        \"Principal\": \"*\",
        \"Action\": \"s3:PutObject\",
        \"Resource\": \"arn:aws:s3:::$BUCKET_NAME/*\",
        \"Condition\": {
          \"StringNotEquals\": {
            \"s3:x-amz-server-side-encryption\": \"AES256\"
          }
        }
      },
      {
        \"Sid\": \"DenyHTTP\",
        \"Effect\": \"Deny\",
        \"Principal\": \"*\",
        \"Action\": \"s3:*\",
        \"Resource\": [
          \"arn:aws:s3:::$BUCKET_NAME\",
          \"arn:aws:s3:::$BUCKET_NAME/*\"
        ],
        \"Condition\": {
          \"Bool\": { \"aws:SecureTransport\": \"false\" }
        }
      }
    ]
  }"

# ── 8. Crea IAM User minimale per l'applicazione ─────────────────────────
# NON usare l'account root o credenziali admin nell'app
USER_NAME="mia-app-s3-user"

aws iam create-user --user-name $USER_NAME

# Policy minimale — solo le operazioni necessarie
aws iam put-user-policy \
  --user-name $USER_NAME \
  --policy-name "S3AppPolicy" \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": [
        \"s3:PutObject\",
        \"s3:GetObject\",
        \"s3:DeleteObject\",
        \"s3:HeadObject\",
        \"s3:ListBucket\"
      ],
      \"Resource\": [
        \"arn:aws:s3:::$BUCKET_NAME\",
        \"arn:aws:s3:::$BUCKET_NAME/*\"
      ]
    }]
  }"

# Crea access key per l'applicazione
aws iam create-access-key --user-name $USER_NAME
# → Copia AccessKeyId e SecretAccessKey nel tuo .env
# → MAI committarli nel repository

# ── 9. Abilitare CloudTrail per audit log accessi S3 ─────────────────────
# (consigliato in produzione)
# aws cloudtrail create-trail \
#   --name mia-app-trail \
#   --s3-bucket-name mio-audit-logs-bucket \
#   --include-global-service-events \
#   --is-multi-region-trail
# aws cloudtrail start-logging --name mia-app-trail

# ── Checklist sicurezza S3 ────────────────────────────────────────────────
# ✅ Block Public Access: ON
# ✅ Versioning: abilitato
# ✅ Crittografia AES-256: abilitata e forzata dalla bucket policy
# ✅ HTTPS forzato: deny HTTP plain via bucket policy
# ✅ IAM minimal: solo operazioni necessarie, no wildcard
# ✅ Credenziali: solo in variabili d'ambiente del server, mai nel codice
# ✅ Path strutturati: userId/category/uuid.ext (previene path traversal)
# ✅ Validazione MIME server-side: prima di ogni upload
# ✅ Ownership check: ogni operazione verifica che key inizi con userId/
# ✅ Presigned URL: scadenza breve (15 min), mai URL permanenti per file privati
# ✅ Lifecycle rules: pulizia automatica file temporanei e versioni vecchie
