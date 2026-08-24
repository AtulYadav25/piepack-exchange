export const users = [{
    userId: "58317cad-57fc-4417-86f9-70f0137085f3",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1ODMxN2NhZC01N2ZjLTQ0MTctODZmOS03MGYwMTM3MDg1ZjMiLCJlbWFpbCI6InBvcHAyQGdtYWlsLmNvbSIsImlhdCI6MTc4NzU0OTgyNSwiZXhwIjoxNzg4MTU0NjI1fQ.6xLmFZH3AHfLFVl72f5PcIfP6ffcCQnFxDW1NGD0cxI"
},
{
    userId: "c9b882a0-1881-497c-80b5-2546888c7b05",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjOWI4ODJhMC0xODgxLTQ5N2MtODBiNS0yNTQ2ODg4YzdiMDUiLCJlbWFpbCI6InBvcDJAZ21haWwuY29tIiwiaWF0IjoxNzg3NTQ5NjIwLCJleHAiOjE3ODgxNTQ0MjB9.MMofQHynYtTjd6HUobZ2m_2B-3_vhmeB2wvmG7qPJnI",
}
]
//AI Agent automatically got me a correct userId from the token which is JWT, is this correct?

export const SUPPORTED_MARKETS = ['BTC-USDC', 'ETH-USDC', 'SOL-USDC'] as const;

export type Market = (typeof SUPPORTED_MARKETS)[number];