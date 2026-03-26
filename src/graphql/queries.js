/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getUserPoint = /* GraphQL */ `
  query GetUserPoint($id: ID!) {
    getUserPoint(id: $id) {
      id
      points
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const listUserPoints = /* GraphQL */ `
  query ListUserPoints(
    $filter: ModelUserPointFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUserPoints(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        points
        createdAt
        updatedAt
        owner
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getStore = /* GraphQL */ `
  query GetStore($id: ID!) {
    getStore(id: $id) {
      id
      name
      latitude
      longitude
      isOperating
      lastUpdated
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listStores = /* GraphQL */ `
  query ListStores(
    $filter: ModelStoreFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listStores(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        latitude
        longitude
        isOperating
        lastUpdated
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getConfig = /* GraphQL */ `
  query GetConfig($id: ID!) {
    getConfig(id: $id) {
      id
      menuJson
      scheduleJson
      dummy
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listConfigs = /* GraphQL */ `
  query ListConfigs(
    $filter: ModelConfigFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listConfigs(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        menuJson
        scheduleJson
        dummy
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
