import { WhizPlugin, AppExtension, AppsPointId, PluginConst, PageExtension, MainPagePointId, EntityTypeExtension, EntityTypesPointId} from "shared/whiz/plugins/PluginDefs";
import { DbPointId, LoginProviderExtension, LoginProvidersPointId, SqlDbExtension } from "../whiz/plugins/ServerPluginDefs.js";

const Plugin:WhizPlugin = {
    id: "touring.app",

    extensionPoints: [
      {
         id: PluginConst.rootPagesPointId,
         target: PluginConst.webPluginTarget
      }
    ],

    extensions: [
        <AppExtension> {
            pointId: AppsPointId,
            id: "touring.app",
            mainPageId: "touring.mainPage",
            loginPageId: "touring.loginPage",
            publicPath: "",
            initialPagePath: "index.html",
            initialPageUris: ["/app"],
            appUrlPath: "/app"
        },
        <SqlDbExtension> {
          pointId: DbPointId,
          id: "touring.db",
          module: () => import("../whiz/db/PostgresDb.js"),
          label: "touringDb",
          dbOptions: {
            database: process.env.DATABASE_NAME, 
            host: process.env.DATABASE_HOST || undefined,
            port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : undefined,
            user: process.env.DATABASE_USER, 
            password: process.env.DATABASE_PASSWORD
          },
          isDefault: true
        },
        <LoginProviderExtension> {
            pointId: LoginProvidersPointId,
            id: "touring.loginProvider",
            module: () => import("./LoginProvider.js"),
        },
        <EntityTypeExtension> {
            pointId: EntityTypesPointId,
            id: "touring.geoPlace",
            tableName: "geo_places",
            controllerUrl: "/touring/geo_places",
            dataHandler: () => import("./GeoPlacesDataHandler.js"),
            fields: [
                {name: "id"},
                {name: "name"},
                {name: "normalized_name"},
                {name: "country_code"},
                {name: "country_name"},
                {name: "usa_state"},
                {name: "location"},
                {name: "population"},

                // passed in persitence entioties to compute the "location" column
                {name: "$latitude"},
                {name: "$longitude"},                
            ]
        },
        <PageExtension> {
            pointId: MainPagePointId,
            id: "touring.mainPage",
            componentKey: "app/MainPage",
            hostedPointId: PluginConst.rootPagesPointId
        },
        <PageExtension> {
            pointId: MainPagePointId,
            id: "touring.loginPage",
            componentKey: "app/LoginPage"
        }
    ]
 }
 export default Plugin;
