import Ajv, {JSONSchemaType, ValidateFunction} from 'ajv';
import { FiltersInterface } from '../@types';

const ajv = new Ajv({timestamp: "date"});

const schema: JSONSchemaType<FiltersInterface> = {
  type: 'object',
  properties: {
    categories: {
      type: 'array',
      items: {
        type: 'string',
      }
    },
    accesibility: {
      type: 'array',
      items: {
        type: 'string',
      }
    },
    verifiedDateRange: {
      type: 'array',
      nullable: true,
      items: {
        type: 'string',
      }
    },
    superstarDateRange: {
      type: 'array',
      nullable: true,
      items: {
        type: 'string',
      }
    },
    dataSources: {
      type: 'array',
      items: {
        type: 'string',
      }
    },
    badges: {
      type: 'array',
      items: {
        type: 'string',
      }
    },
    bbox: {
      type: 'object',
      nullable: true,
      properties: {
        xmin: {
          type: 'number'
        },
        ymin: {
          type: 'number'
        },
        xmax: {
          type: 'number'
        },
        ymax: {
          type: 'number'
        }
      },
      required: ['xmin', 'ymin', 'xmax', 'ymax']
    },
    superstar_badge: {
      type: 'string',
      nullable: true
    }
  },
  required: ['categories', 'accesibility', 'badges', 'dataSources']
};

const validateFilters: ValidateFunction<FiltersInterface> = ajv.compile(schema);

export default validateFilters;