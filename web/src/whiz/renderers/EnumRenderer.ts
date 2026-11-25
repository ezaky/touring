
import { EnumItem, RendererParams } from "shared/whiz/entities/EntityField";
import StringUtil from "shared/whiz/util/StringUtil";
import RenderingUtil from "./RenderingUtil";
import * as _ from "lodash-es";
import { html } from "lit-html";

export default class EnumRenderer {
   private _items: EnumItem[];
   private _itemsByValue: {[value: string]: EnumItem};

   constructor(items: (EnumItem|string)[]) {
      this._items = items ? RenderingUtil.normalizeEnumItems(items) : [];
      this._itemsByValue = _.keyBy(this._items, "value");
   }
   render(params: RendererParams) {
      let item: EnumItem;
      // support EnumItem values as part of the support in EnumFormField
      if (_.isObject(params.value)) {
         item = params.value;
      } else {
         item = this._itemsByValue[params.value];
      }
      return this.renderItem(item, params);
   }
   renderItem(item: EnumItem, params: RendererParams) {
      let label = this.renderLabel(item?.label || StringUtil.getLabelForId(params.value), params);
      let icon = item.icon;
      if (!icon) {
         return label;
      }
      let iconStyle = item.iconColor ? `color: ${item.iconColor}`: "";
      return html`<wa-icon name="${icon}" family="${item.iconFamily || ""}" variant="light" style="${iconStyle}" animation="${item.iconAnimation}"></wa-icon> ${label}`;
   }
   protected renderLabel(label, params: RendererParams) {
      return html`<span>${label}</span>`;
   }
   getItems(): EnumItem[] {
      return this._items;
   }
   getItem(value): EnumItem {
      return this._itemsByValue[value];;
   }
}