import HttpLogger from "pino-http";
import EnvUtil from "../util/EnvUtil";
import * as _ from "lodash-es";

const isProduction = EnvUtil.isProduction();

export const httpLogger = HttpLogger({
    level: isProduction ? 'info' : 'debug',
    // Removes 'pid' and 'hostname' from every log entry
    base: undefined,
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    // Formats level number (30) as string ("info")
    formatters: {
        level: label => {
            return { level: label };
        },
    },
    // This prevents the 'res' and 'req' serializers from including headers
    serializers: {
        req: (req) => {
            return _.pick(req, ["method", "url", "query", "params"]);
        },
        res: (res) => {
            return {statusCode: res.statusCode};
        }
    },
    transport: isProduction ? undefined : {
        target: "pino-pretty",
        options: {
          colorize: true
        }
    },
    autoLogging: {
        // ignore static assets
        ignore: (req) => {
            const staticAssetRegex = /\.(js|css|map|png|jpg|jpeg|gif|svg|ico|webm|mp4|woff|woff2|ttf|eot)$/i;
            return staticAssetRegex.test(req.url);
        }
    }
});
export default httpLogger.logger;

