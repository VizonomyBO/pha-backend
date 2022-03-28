import { PhaRetailer } from "@/@types/database";
// import Ajv, { JSONSchemaType } from "ajv";
import Ajv, {JTDSchemaType, ValidateFunction} from "ajv/dist/jtd"

const ajv = new Ajv({timestamp: "date"});

const schema: JTDSchemaType<PhaRetailer> = {
  properties: {
    latitude: {
      type: "float64"
    },
    longitude: {
      type: "float64"
    },
    name: {
      type: "string"
    },
    address_1: {
      type: "string"
    },
    address_2: {
      type: "string"
    },
    phone: {
      type: "string"
    },
    city: {
      type: "string"
    },
    state: {
      type: "string"
    },
    zipcode: {
      type: "string"
    },
    corner_store: {
      type: "string"
    },
    distribution: {
      type: "string"
    },
    farmers_market: {
      type: "string"
    },
    food_pantry: {
      type: "string"
    },
    food_co_op: {
      type: "string"
    },
    supermarket: {
      type: "string"
    },
    dollar_stores: {
      type: "string"
    },
    wic_accepted: {
      type: "string"
    },
    snap_accepted: {
      type: "string"
    },
    description: {
      type: "string"
    },
    availability: {
      type: "string"
    },
    quality: {
      type: "string"
    },
    visibility: {
      type: "string"
    },
    local: {
      type: "string"
    },
    produce_avail_store: {
      type: "string"
    },
    produce_avail_seasonally: {
      type: "string"
    },
    contact_name: {
      type: "string"
    },
    contact_email: {
      type: "string"
    },
    contact_owner: {
      type: "string"
    },
    contact_patron: {
      type: "string"
    },
    general_store: {
      type: "string"
    },
    grocery_store: {
      type: "string"
    },
    submission_date: {
      type: "timestamp"
    },
    submission_status: {
      type: "string"
    },
  },
  optionalProperties: {
    retailer_id: {
      type: "int32",
    },
    sun_open: {
      type: "string",
    },
    sun_close: {
      type: "string",
    },
    mon_open: {
      type: "string",
    },
    mon_close: {
      type: "string",
    },
    tues_open: {
      type: "string",
    },
    tues_close: {
      type: "string",
    },
    wed_open: {
      type: "string",
    },
    wed_close: {
      type: "string",
    },
    thurs_open: {
      type: "string",
    },
    thurs_close: {
      type: "string",
    },
    fri_open: {
      type: "string",
    },
    fri_close: {
      type: "string",
    },
    sat_open: {
      type: "string",
    },
    sat_close: {
      type: "string",
    },
    website: {
      type: "string",
    },
    facebook: {
      type: "string",
    },
    instagram: {
      type: "string",
    },
    twitter: {
      type: "string",
    },
    email: {
      type: "string",
    },
    owner_photo: {
      type: "string",
    },
    owner_name: {
      type: "string",
    },
  }
};

const validatePhaRetailer: ValidateFunction<PhaRetailer> = ajv.compile(schema);

export default validatePhaRetailer;