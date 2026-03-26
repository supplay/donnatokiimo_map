/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createStore = /* GraphQL */ `
  mutation CreateStore(
    $input: CreateStoreInput!
    $condition: ModelStoreConditionInput
  ) {
    createStore(input: $input, condition: $condition) {
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
export const updateStore = /* GraphQL */ `
  mutation UpdateStore(
    $input: UpdateStoreInput!
    $condition: ModelStoreConditionInput
  ) {
    updateStore(input: $input, condition: $condition) {
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
export const deleteStore = /* GraphQL */ `
  mutation DeleteStore(
    $input: DeleteStoreInput!
    $condition: ModelStoreConditionInput
  ) {
    deleteStore(input: $input, condition: $condition) {
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
