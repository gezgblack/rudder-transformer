import Router from "koa-router";
import EventTestController from "../controllers/eventTest.controller";

const router = new Router({ prefix: "/test-router" });

router.post("/:version/:destination", EventTestController.testEvent);
router.get("/:version/health", EventTestController.status);

export const sourceRoutes = router.routes();