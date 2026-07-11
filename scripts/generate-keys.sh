#!/bin/bash
# Generates ECDSA keys for JWT signing
echo "Generating ECDSA keys for VoiceOS..."
mkdir -p keys

if [ ! -f "keys/private.pem" ]; then
  openssl ecparam -name prime256v1 -genkey -noout -out keys/private.pem
  openssl ec -in keys/private.pem -pubout -out keys/public.pem
  echo "Keys generated in keys/"
else
  echo "Keys already exist."
fi
