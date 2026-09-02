export const users = [{
    userId: "5be4183d-926c-4474-a3d9-cd52d3ac3932",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1YmU0MTgzZC05MjZjLTQ0NzQtYTNkOS1jZDUyZDNhYzM5MzIiLCJlbWFpbCI6InNlZWQxQGdtYWlsLmNvbSIsImlhdCI6MTc4ODM0MDg3MSwiZXhwIjoxNzg4OTQ1NjcxfQ.KIg7fSjqGBgKTu7ya81rKnvcpFrCYaY7rBpz4WJMoVM"
},
{
    userId: "1c4ed13f-9e87-4a3a-93a1-230ab87e1800",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxYzRlZDEzZi05ZTg3LTRhM2EtOTNhMS0yMzBhYjg3ZTE4MDAiLCJlbWFpbCI6InNlZWQyQGdtYWlsLmNvbSIsImlhdCI6MTc4ODM0MDkyNSwiZXhwIjoxNzg4OTQ1NzI1fQ.aMtNaBSQelnPHNiiN0sq-ijeZWdpFfbDt92n735uqpQ",
}
]
//AI Agent automatically got me a correct userId from the token which is JWT, is this correct?

export const SUPPORTED_MARKETS = ['BTC-USDC', 'ETH-USDC', 'SOL-USDC'] as const;

export type Market = (typeof SUPPORTED_MARKETS)[number];