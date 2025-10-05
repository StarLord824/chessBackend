import { Router } from "express";

const healthRouter = Router();

healthRouter.get('/', (req, res) => {
    res.send('Healthy');
});

export default healthRouter;