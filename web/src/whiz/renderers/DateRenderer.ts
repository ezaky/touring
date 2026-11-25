import { RendererParams } from "shared/whiz/entities/EntityField";
import DateUtil from "../util/DateUtil";
// import '@web.awesome.me/webawesome-pro/dist/components/format-date/format-date.js';
import { html } from 'lit-html';  

export interface DateTimeRendererParams extends RendererParams {
   shortDate?: boolean
}
export default class DateRenderer {
   render(params: DateTimeRendererParams) {
      /*
      let template = html`<wa-format-date date="${params.value}"></wa-format-date>`;
      console.log(params.value, template);
      return template;
      */      
      let value = params.value;
      if (!value) {
         return;
      }
      let dateStr;
      if (params.shortDate) {
         dateStr = DateUtil.getShortString(value, params);
      } else {
         dateStr = DateUtil.formatDate(value, params);
      }
      return html`${dateStr}`;
   }
 }
