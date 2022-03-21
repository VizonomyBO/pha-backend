import * as express from 'express';
import { Request, Response } from 'express';

const app = express();

app.get('/', async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Express working' });
});

const port = 9000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
