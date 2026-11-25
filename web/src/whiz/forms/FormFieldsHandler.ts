import { EntityField } from "shared/whiz/entities/EntityField";
import EntityForm from "../entities/EntityForm";
import { Entity } from "shared/whiz/entities/QueryDefs";
import { DialogSubmitSpec } from "../components/DialogDefs";
import { EntityFormBeforeSubmitResponse } from "../entities/EntityDefs";

export interface FormFieldsHandlerProps {
    form: EntityForm
}

export default class FormFieldsHandler {
    protected props: FormFieldsHandlerProps;
    
    constructor(props: FormFieldsHandlerProps) {
        this.props = props;
    }
    async loadData() {
    }
    adjustFieldsToRender(fields: EntityField[]): EntityField[] {
        return fields;
    }
    async beforeSubmit(entity: Entity, submitSpec: DialogSubmitSpec): Promise<EntityFormBeforeSubmitResponse> {
        return null;
    }
    onChange(e) {
    }
}