/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateUserPoint = /* GraphQL */ `
  subscription OnCreateUserPoint(
    $filter: ModelSubscriptionUserPointFilterInput
    $owner: String
  ) {
    onCreateUserPoint(filter: $filter, owner: $owner) {
      id
      points
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onUpdateUserPoint = /* GraphQL */ `
  subscription OnUpdateUserPoint(
    $filter: ModelSubscriptionUserPointFilterInput
    $owner: String
  ) {
    onUpdateUserPoint(filter: $filter, owner: $owner) {
      id
      points
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onDeleteUserPoint = /* GraphQL */ `
  subscription OnDeleteUserPoint(
    $filter: ModelSubscriptionUserPointFilterInput
    $owner: String
  ) {
    onDeleteUserPoint(filter: $filter, owner: $owner) {
      id
      points
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onCreateShop = /* GraphQL */ `
  subscription OnCreateShop($filter: ModelSubscriptionShopFilterInput) {
    onCreateShop(filter: $filter) {
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
export const onUpdateShop = /* GraphQL */ `
  subscription OnUpdateShop($filter: ModelSubscriptionShopFilterInput) {
    onUpdateShop(filter: $filter) {
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
export const onDeleteShop = /* GraphQL */ `
  subscription OnDeleteShop($filter: ModelSubscriptionShopFilterInput) {
    onDeleteShop(filter: $filter) {
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
export const onCreateConfig = /* GraphQL */ `
  subscription OnCreateConfig($filter: ModelSubscriptionConfigFilterInput) {
    onCreateConfig(filter: $filter) {
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
export const onUpdateConfig = /* GraphQL */ `
  subscription OnUpdateConfig($filter: ModelSubscriptionConfigFilterInput) {
    onUpdateConfig(filter: $filter) {
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
export const onDeleteConfig = /* GraphQL */ `
  subscription OnDeleteConfig($filter: ModelSubscriptionConfigFilterInput) {
    onDeleteConfig(filter: $filter) {
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
export const onCreateUserSubscription = /* GraphQL */ `
  subscription OnCreateUserSubscription(
    $filter: ModelSubscriptionUserSubscriptionFilterInput
  ) {
    onCreateUserSubscription(filter: $filter) {
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
export const onUpdateUserSubscription = /* GraphQL */ `
  subscription OnUpdateUserSubscription(
    $filter: ModelSubscriptionUserSubscriptionFilterInput
  ) {
    onUpdateUserSubscription(filter: $filter) {
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
export const onDeleteUserSubscription = /* GraphQL */ `
  subscription OnDeleteUserSubscription(
    $filter: ModelSubscriptionUserSubscriptionFilterInput
  ) {
    onDeleteUserSubscription(filter: $filter) {
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
