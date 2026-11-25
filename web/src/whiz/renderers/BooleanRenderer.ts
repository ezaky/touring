import { RendererParams } from "shared/whiz/entities/EntityField";
import { html } from 'lit-html';  

const TrueLabel = "Yes";
const FalseLabel = "No";

export default class BooleanRenderer {
   render(params: RendererParams) { 
      return html`${params.value ? TrueLabel : FalseLabel}`;
   }
 }
