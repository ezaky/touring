import { EntityFormProps } from "./EntityDefs";
import EntityForm from "./EntityForm";
import * as _ from "lodash-es";

export interface DynamicEntityFormProps extends EntityFormProps {
    dynamicFieldName: string
}
export default class DynamicEntityForm<T extends DynamicEntityFormProps = DynamicEntityFormProps> extends EntityForm<T> {
    private _dynamicValue: any;
    
    public onChange(e) {
        let formField = e.target;
        if (formField.name !== this.props.dynamicFieldName) {
            return;
        }
        this._dynamicValue = formField.value;
        this.refresh();
    }
    public getDynamicValue() {
        if (this._dynamicValue === undefined) {
            const entity = this.getEntity();
            if (entity) {
                this._dynamicValue = _.get(entity, this.props.dynamicFieldName);
            } else {
                this._dynamicValue = this.entityType.getField(this.props.dynamicFieldName)?.formField?.defaultValue;
            }
        }
        return this._dynamicValue;
    }
}
