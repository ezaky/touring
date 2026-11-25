import { RendererParams } from "shared/whiz/entities/EntityField";
import * as _ from "lodash-es";
import RenderingUtil from "./RenderingUtil";

export default class UrlRenderer {
    render(params: RendererParams) {
        const url = params.value;
        if (!url) {
            return;
        }
        const domain = new URL(url).hostname;
        return RenderingUtil.renderTooltipLink(domain.replace("www.", ""), url);
    }
}