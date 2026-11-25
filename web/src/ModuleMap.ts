import { ModuleSpec } from "../../shared/whiz/plugins/PluginDefs.js"

const ModuleMap: {[key: string]: ModuleSpec} = {
    "app/MainPage": () => import("./app/MainPage"),
    "app/LoginPage": () => import("./app/LoginPage"),
    "performers/PerformerPage": () => import("./performers/PerformerPage"),
    "performers/TourStopForm": () => import("./performers/TourStopForm"),
    "performers/GeoPlaceFormField": () => import("./performers/GeoPlaceFormField"),
    "test/TestPage": () => import("./test/TestPage"),
    "website/HomePage": () => import("./website/HomePage"),
    "website/NewPerformerPage": () => import("./website/NewPerformerPage"),

    "whiz/renderers/DateRenderer": () => import("./whiz/renderers/DateRenderer"),
    "whiz/renderers/BooleanRenderer": () => import("./whiz/renderers/BooleanRenderer"),
    "whiz/renderers/ArrayRenderer": () => import("./whiz/renderers/ArrayRenderer"),
    "whiz/renderers/UrlRenderer": () => import("./whiz/renderers/UrlRenderer"),
    "whiz/entities/EntityCommandsProvider": () => import("./whiz/entities/EntityCommandsProvider"),
    "whiz/entities/EntityForm": () => import("./whiz/entities/EntityForm"),

    "whiz/components/Dialog": () => import("./whiz/components/Dialog"),

    "whiz/forms/Form": () => import("./whiz/forms/Form"),
    "whiz/forms/TextFormField": () => import("./whiz/forms/TextFormField"),
    "whiz/forms/BooleanFormField": () => import("./whiz/forms/BooleanFormField"),
    "whiz/forms/EnumFormField": () => import("./whiz/forms/EnumFormField"),
    "whiz/forms/NumberFormField": () => import("./whiz/forms/NumberFormField"),
    "whiz/forms/DateFormField": () => import("./whiz/forms/DateFormField"),
    "whiz/forms/DateRangeFormField": () => import("./whiz/forms/DateRangeFormField"),
    "whiz/forms/FileFormField": () => import("./whiz/forms/FileFormField"),
    "whiz/forms/EntitiesFormField": () => import("./whiz/forms/EntitiesFormField"),
    "whiz/forms/StaticTextFormField": () => import("./whiz/forms/StaticTextFormField"),
    "whiz/renderers/EnumRenderer": () => import("./whiz/renderers/EnumRenderer")
};

export default ModuleMap;