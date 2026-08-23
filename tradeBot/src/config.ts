export const users = [{
    userId: "f3948bcd-27c1-4096-aa24-e3f36bb0aeeb",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmMzk0OGJjZC0yN2MxLTQwOTYtYWEyNC1lM2YzNmJiMGFlZWIiLCJlbWFpbCI6InNpbXBsZUBnbWFpbC5jb20iLCJpYXQiOjE3ODc0MTczOTIsImV4cCI6MTc4ODAyMjE5Mn0.H_rO3u1ggnYbEmI2FcGxAdsBLeK01z-wamWst77vBOg"
},
{
    userId: "6238d148-ea6c-462a-98be-dc3fc3f2375f",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MjM4ZDE0OC1lYTZjLTQ2MmEtOThiZS1kYzNmYzNmMjM3NWYiLCJlbWFpbCI6ImtyYXRvc0BnbWFpbC5jb20iLCJpYXQiOjE3ODc0MTcyODcsImV4cCI6MTc4ODAyMjA4N30.10PO0HkcJy2we_vtGeOO6uu5WxKKUrgGZVtAUAcLK9c",
}
]
//AI Agent automatically got me a correct userId from the token which is JWT, is this correct?

export const SUPPORTED_MARKETS = ['BTC-USDC', 'ETH-USDC', 'SOL-USDC'] as const;

export type Market = (typeof SUPPORTED_MARKETS)[number];