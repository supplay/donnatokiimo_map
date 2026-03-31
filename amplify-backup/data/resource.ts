type Shop
  @model
  @auth(rules: [
    { allow: public, operations: [read] },
    { allow: private, operations: [read, create, update] }
  ]) {
  id: ID!
  name: String
  lat: Float
  lng: Float
  isOpen: Boolean
  catchCopy: String
  lastUpdated: AWSDateTime
}

type Config
  @model
  @auth(rules: [
    { allow: public, operations: [read] },
    { allow: private, operations: [read, create, update] }
  ]) {
  id: ID!
  menuJson: String
  scheduleJson: String
}

type PointCard
  @model
  @auth(rules: [
    { allow: private, operations: [read, create, update] }
  ]) {
  id: ID!
  userId: String!
  points: Int!
}

type PushSubscription
  @model
  @auth(rules: [
    { allow: private, operations: [read, create, update] }
  ]) {
  id: ID!
  endpoint: String!
  p256dh: String!
  auth: String!
  userId: String
}