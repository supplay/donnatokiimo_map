/* eslint-disable */
// this is an auto generated file. This will be overwritten

<<<<<<< HEAD
export const createStore = /* GraphQL */ `
  mutation CreateStore(
    $input: CreateStoreInput!
    $condition: ModelStoreConditionInput
  ) {
    createStore(input: $input, condition: $condition) {
      id
      name
      lat
      lng
      isOperating
      catchCopy
=======
export const createShop = /* GraphQL */ `
  mutation CreateShop(
    $input: CreateShopInput!
    $condition: ModelShopConditionInput
  ) {
    createShop(input: $input, condition: $condition) {
      id
      name
      latitude
      longitude
      isOperating
>>>>>>> main
      lastUpdated
      createdAt
      updatedAt
      __typename
    }
  }
`;
<<<<<<< HEAD
export const updateStore = /* GraphQL */ `
  mutation UpdateStore(
    $input: UpdateStoreInput!
    $condition: ModelStoreConditionInput
  ) {
    updateStore(input: $input, condition: $condition) {
      id
      name
      lat
      lng
      isOperating
      catchCopy
=======
export const updateShop = /* GraphQL */ `
  mutation UpdateShop(
    $input: UpdateShopInput!
    $condition: ModelShopConditionInput
  ) {
    updateShop(input: $input, condition: $condition) {
      id
      name
      latitude
      longitude
      isOperating
>>>>>>> main
      lastUpdated
      createdAt
      updatedAt
      __typename
    }
  }
`;
<<<<<<< HEAD
export const deleteStore = /* GraphQL */ `
  mutation DeleteStore(
    $input: DeleteStoreInput!
    $condition: ModelStoreConditionInput
  ) {
    deleteStore(input: $input, condition: $condition) {
      id
      name
      lat
      lng
      isOperating
      catchCopy
=======
export const deleteShop = /* GraphQL */ `
  mutation DeleteShop(
    $input: DeleteShopInput!
    $condition: ModelShopConditionInput
  ) {
    deleteShop(input: $input, condition: $condition) {
      id
      name
      latitude
      longitude
      isOperating
>>>>>>> main
      lastUpdated
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createConfig = /* GraphQL */ `
  mutation CreateConfig(
    $input: CreateConfigInput!
    $condition: ModelConfigConditionInput
  ) {
    createConfig(input: $input, condition: $condition) {
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
export const updateConfig = /* GraphQL */ `
  mutation UpdateConfig(
    $input: UpdateConfigInput!
    $condition: ModelConfigConditionInput
  ) {
    updateConfig(input: $input, condition: $condition) {
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
export const deleteConfig = /* GraphQL */ `
  mutation DeleteConfig(
    $input: DeleteConfigInput!
    $condition: ModelConfigConditionInput
  ) {
    deleteConfig(input: $input, condition: $condition) {
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
export const createUserPoint = /* GraphQL */ `
  mutation CreateUserPoint(
    $input: CreateUserPointInput!
    $condition: ModelUserPointConditionInput
  ) {
    createUserPoint(input: $input, condition: $condition) {
      id
      points
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const updateUserPoint = /* GraphQL */ `
  mutation UpdateUserPoint(
    $input: UpdateUserPointInput!
    $condition: ModelUserPointConditionInput
  ) {
    updateUserPoint(input: $input, condition: $condition) {
      id
      points
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const deleteUserPoint = /* GraphQL */ `
  mutation DeleteUserPoint(
    $input: DeleteUserPointInput!
    $condition: ModelUserPointConditionInput
  ) {
    deleteUserPoint(input: $input, condition: $condition) {
      id
      points
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
<<<<<<< HEAD
export const deleteUserSubscription = /* GraphQL */ `
  mutation DeleteUserSubscription(
    $input: DeleteUserSubscriptionInput!
    $condition: ModelUserSubscriptionConditionInput
  ) {
    deleteUserSubscription(input: $input, condition: $condition) {
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
export const createUserSubscription = /* GraphQL */ `
  mutation CreateUserSubscription(
    $input: CreateUserSubscriptionInput!
    $condition: ModelUserSubscriptionConditionInput
  ) {
    createUserSubscription(input: $input, condition: $condition) {
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
export const updateUserSubscription = /* GraphQL */ `
  mutation UpdateUserSubscription(
    $input: UpdateUserSubscriptionInput!
    $condition: ModelUserSubscriptionConditionInput
  ) {
    updateUserSubscription(input: $input, condition: $condition) {
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
=======
>>>>>>> main
