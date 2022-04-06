import Ajv, {JTDSchemaType, ValidateFunction} from 'ajv/dist/jtd';
import { FiltersInterface } from '../@types';

const ajv = new Ajv({timestamp: "date"});

const schema: JTDSchemaType<FiltersInterface> = {
  properties: {
    categories: {
      elements: {
        type: "string"
      }
    },
    accesibility: {
      elements: {
        type: "string"
      }
    },
    dataSources: {
      elements: {
        type: "string"
      }
    },
    badges: {
      elements: {
        type: "string"
      }
    }
  },
};

const validateFilters: ValidateFunction<FiltersInterface> = ajv.compile(schema);

export default validateFilters;