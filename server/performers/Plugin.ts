import { WhizPlugin, AppExtension, AppsPointId, PluginConst, PageExtension, MainPagePointId, EntityTypeExtension, EntityTypesPointId, UnhostedPagesPointId} from "shared/whiz/plugins/PluginDefs";
import { ControllerExtension, ControllersPointId } from "../whiz/plugins/ServerPluginDefs.js";
import { EntityRelationType } from "shared/whiz/entities/EntityRelationField.js";

const Plugin:WhizPlugin = {
    id: "touring.performers",

    extensions: [
      <EntityTypeExtension> {
            pointId: EntityTypesPointId,
            id: "touring.performer",
            tableName: "performers",
            controllerUrl: "/touring/performers",
            dataHandler: () => import("./PerformersDataHandler.js"), 
            fields: [
                {name: "id"},
                {name: "name"},
                {name: "email"},
                {name: "password"},
                {name: "bio"},
                {name: "imageFilename"},
                {name: "fans_email_content"},
                {name: "slug"}
            ]
        },
        <EntityTypeExtension> {
            pointId: EntityTypesPointId,
            id: "touring.tourStop",
            tableName: "tour_stops",
            controllerUrl: "/touring/tour-stops",
            fields: [
                {name: "id"},
                {name: "performer_id"},
                {name: "place_id"},
                {name: "start_date"},
                {name: "end_date"}
            ],
            relationFields: [{
                name: "place",
                entityTypeId: "touring.geoPlace",
                type: EntityRelationType.ManyToOne,
                sourceIdField: "place_id",
                targetIdField: "id"
            }],
            label: "Date"
        },
        <ControllerExtension> {
            pointId: ControllersPointId,
            id: "touring.performers.new_performer_controller",
            url: "/touring/performers/new",
            module: () => import("./NewPerformerController.js"), 
            method: "Post",
            isPublic: true
        },
        <PageExtension> {
            pointId: UnhostedPagesPointId,
            id: "touring.website.new_performer_page",
            componentKey: "website/NewPerformerPage"
        },
        <PageExtension> {
            pointId: PluginConst.rootPagesPointId,
            id: "touring.rootPages.performer_page",
            componentKey: "performers/PerformerPage",
            precedingId: null
        }
    ]
 }
 export default Plugin;
