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
export const getShop = /* GraphQL */ `
  query GetShop($id: ID!) {
    getShop(id: $id) {
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
export const listShops = /* GraphQL */ `
  query ListShops(
    $filter: ModelShopFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listShops(filter: $filter, limit: $limit, nextToken: $nextToken) {
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
export const getUserSubscription = /* GraphQL */ `
  query GetUserSubscription($id: ID!) {
    getUserSubscription(id: $id) {
      id
      userId
      subscription
      userLat
      userLng
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listUserSubscriptions = /* GraphQL */ `
  query ListUserSubscriptions(
    $filter: ModelUserSubscriptionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUserSubscriptions(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        userId
        subscription
        userLat
        userLng
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
