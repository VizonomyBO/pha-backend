import { PhaIndividual } from "@/@types/database";
import Ajv, {JTDSchemaType, ValidateFunction} from "ajv/dist/jtd"

const ajv = new Ajv({timestamp: "date"});

const schema: JTDSchemaType<PhaIndividual> = {
  properties: {
    retailer_id: {
      type: "string"
    },
  },
  optionalProperties: {
    individual_id: {
      type: "string",
    },
    availability: {
      type: "string",
    },
    quality: {
      type: "string",
    },
    visibility: {
      type: "string",
    },
    local: {
      type: "string",
    },
    meets_need: {
      type: "string",
    },
    produce_avail_store: {
      type: "string",
    },
    contact_name: {
      type: "string",
    },
    contact_email: {
      type: "string",
    },
    contact_phone: {
      type: "string",
    },
    contact_zipcode: {
      type: "string",
    },
    submission_date: {
      type: "timestamp",
    },
    submission_status: {
      type: "string",
    },
  }
};

const validatePhaIndividual: ValidateFunction<PhaIndividual> = ajv.compile(schema);

export default validatePhaIndividual;