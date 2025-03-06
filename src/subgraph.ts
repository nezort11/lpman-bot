import {
  ApolloClient,
  InMemoryCache,
  gql,
  HttpLink,
} from "@apollo/client/core";

// https://thegraph.com/explorer/subgraphs/Hv1GncLY5docZoGtXjo4kwbTvxm3MAhVZqBZE4sUT9eZ?view=Query&chain=arbitrum-one
const PANCAKESWAP_GRAPHQL_ENDPOINT =
  "https://thegraph.pancakeswap.com/exchange-v3-bsc";

// Create Apollo Client instance
const client = new ApolloClient({
  link: new HttpLink({ uri: PANCAKESWAP_GRAPHQL_ENDPOINT, fetch }),
  cache: new InMemoryCache(),
});

type GraphPosition = {
  id: string;
  owner: string;
  depositedToken0: string;
  depositedToken1: string;
  withdrawnToken0: string;
  withdrawnToken1: string;
};

// Define the query
const ACTIVE_POSITIONS_QUERY = gql`
  query activePositions($owner: Bytes!) {
    positions(first: 5, where: { owner: $owner, liquidity_gt: "0" }) {
      id
      liquidity
      owner
      depositedToken1
      depositedToken0
      collectedFeesToken1
      collectedFeesToken0
      feeGrowthInside0LastX128
      feeGrowthInside1LastX128
      withdrawnToken0
      withdrawnToken1
      #pool {
      #  id
      #  liquidity
      #  feesUSD
      #  feeTier
      #  feeGrowthGlobal0X128
      #  feeProtocol
      #  token0Price
      #  token1Price
      #  totalValueLockedETH
      #  totalValueLockedToken0
      #  totalValueLockedToken1
      #  totalValueLockedUSD
      #  totalValueLockedUSDUntracked
      #  txCount
      #  volumeUSD
      #  volumeToken1
      #  volumeToken0
      #}
      #token0 {
      #  id
      #  name

      #  derivedETH
      #  derivedUSD
      #  poolCount
      #  protocolFeesUSD
      #  totalValueLockedUSD
      #  totalValueLockedUSDUntracked
      #  untrackedVolumeUSD
      #  volume
      #  volumeUSD
      #}
      #token1 {
      #  id
      #  name

      #  derivedETH
      #  derivedUSD
      #  poolCount
      #  protocolFeesUSD
      #  totalValueLockedUSD
      #  totalValueLockedUSDUntracked
      #  untrackedVolumeUSD
      #  volume
      #  volumeUSD
      #}
    }
  }
`;

export interface ActivePositionsResponse {
  positions: GraphPosition[];
}

export const getActivePositions = async (owner: string) => {
  const { data } = await client.query<ActivePositionsResponse>({
    query: ACTIVE_POSITIONS_QUERY,
    variables: {
      owner,
    },
  });

  return data.positions;
};
