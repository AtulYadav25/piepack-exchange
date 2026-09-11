export const users = [{
    userId: "01f6cf3a-306d-4259-a2c4-ee3a4de44a5e",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwMWY2Y2YzYS0zMDZkLTQyNTktYTJjNC1lZTNhNGRlNDRhNWUiLCJlbWFpbCI6ImJvdDFAZ21haWwuY29tIiwiaWF0IjoxNzg5MDIyMzg1LCJleHAiOjE3ODk2MjcxODV9.SS8wkmrTB2Qtsk2xEF8eLRCRKYp1HvTGBxkGPZ65RIk"
},
{
    userId: "505fd4f1-af98-462d-b56b-7558e738ed5c",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDVmZDRmMS1hZjk4LTQ2MmQtYjU2Yi03NTU4ZTczOGVkNWMiLCJlbWFpbCI6ImJvdDJAZ21haWwuY29tIiwiaWF0IjoxNzg5MDIyMzQ3LCJleHAiOjE3ODk2MjcxNDd9.FSq5IZs2AZ1XHVxcy0-iBF2xCF0eyy3tKCBlqMf2F2o",
},
{
    userId: "a45e6b82-839d-4da6-8be8-a05810a05ba8",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhNDVlNmI4Mi04MzlkLTRkYTYtOGJlOC1hMDU4MTBhMDViYTgiLCJlbWFpbCI6ImJvdDNAZ21haWwuY29tIiwiaWF0IjoxNzg5MDIyNTk2LCJleHAiOjE3ODk2MjczOTZ9.6b_lAoYEkbQzx308XIsN1W4XpXoGeyZTDPZjo4SmZtY",
}
]
//AI Agent automatically got me a correct userId from the token which is JWT, is this correct?

export const SUPPORTED_MARKETS = ['BTC-USDC', 'ETH-USDC', 'SOL-USDC'] as const;

export type Market = (typeof SUPPORTED_MARKETS)[number];