# Khan Jeans WhatsApp Bot

Simple rule-based chatbot for Khan Jeans.

## Install

npm install

## Run

npm start

## Test

POST /webhook

Example JSON:

{
  "message": "price"
}

The bot returns a JSON reply.

You can later connect this webhook to WhatsApp Cloud API, Twilio, Green API, or UltraMsg.
