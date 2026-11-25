import { Request as ExpressRequest } from "express";
import { ControllerContext } from "../whiz/controllers/ControllerDefs";
import * as _ from "lodash-es";
import GeoImporter from "./GeoImporter";


export default class TestController {
    async handlePost(req: ExpressRequest, context: ControllerContext) {
        await new GeoImporter().import(context);
    }
}
