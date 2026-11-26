import * as _ from "lodash-es";
import EntityForm from "../whiz/entities/EntityForm";
import { EntityFormProps } from '../whiz/entities/EntityDefs';
import { EntityField } from "shared/whiz/entities/EntityField";
import { msg, str } from '@lit/localize';
import { Entity } from "shared/whiz/entities/QueryDefs";
import { DialogSubmitSpec } from "../whiz/components/DialogDefs";
import DateUtil from "../whiz/util/DateUtil";

const TourStopEntityType = "touring.tourStop";

export interface TourStopFormProps extends EntityFormProps {
    performerId,
    tourStops: Entity[]
}
export default class TourStopForm extends EntityForm<TourStopFormProps> {
    initProps(props: EntityFormProps): void {
        props.entityType = TourStopEntityType;
        props.fields = [
            {
                name: "place_id",
                label: msg("City"),
                formField: {
                    moduleKey: "performers/GeoPlaceFormField"
                }
            },
            {
                name: "$date_range",
                label: msg("Stop Dates"),
                formField: {
                    moduleKey: "whiz/forms/DateRangeFormField",
                    attributes: {"disable-past": true}
                },
                isRequired: true
            }
        ];
        super.initProps(props);
    }
    async loadData() {
        const result = await super.loadData();
        if (this.isForEditing()) {
            const entity = this.getEntity();
            entity["$date_range"] = {from: entity.start_date, to: entity.end_date};
        }
        return result;
    }
    protected getQueryFieldNames(fields: EntityField[]): string[] {
        return ["place_id", "start_date", "end_date"];
    }
    async onSubmit(submitSpec: DialogSubmitSpec) {
        const dateRange = submitSpec.values["$date_range"];
        for (let tourStop of this.props.tourStops) {
            if (tourStop.start_date <= dateRange.to && tourStop.end_date >= dateRange.from) {
                const error = msg(str`These dates are overlapping the stop in ${tourStop.place.name} (${DateUtil.formatDateRange(tourStop.start_date, tourStop.end_date)})`);
                submitSpec.form.setFieldError("$date_range", error);
                throw null;
            }
        }
        return super.onSubmit(submitSpec);
    }
    protected getCreationEntity(newEntity: Entity): Entity {
        newEntity = {...newEntity};
        const range = newEntity["$date_range"];
        delete newEntity["$date_range"];
        newEntity.performer_id = this.props.performerId;
        newEntity.start_date = range.from;
        newEntity.end_date = range.to;
        return newEntity;
    }
}
customElements.define("tour-stop-form", TourStopForm);