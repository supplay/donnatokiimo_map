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
