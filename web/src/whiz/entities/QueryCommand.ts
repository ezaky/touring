import { EntityType } from "shared/whiz/entities/EntityType";
import HttpCommand, { HttpCommandProps } from "../commands/HttpCommand";
import { FindQuerySpec, QuerySpec, QueryType, FindQueryResult, PersistQuerySpec, CreateQueryResult, UpdateQueryResult, DeleteQuerySpec, DeleteQueryResult } from "shared/whiz/entities/QueryDefs";
import * as _ from 'lodash-es';
import WebEntityUtil from "./WebEntityUtil";
import FiltersManager from "./FiltersManager";

type QueryCommandSpec<T extends QueryType> = 
    T extends QueryType.Find 
    ? FindQuerySpec 
    : T extends QueryType.Create 
        ? PersistQuerySpec 
        : T extends QueryType.Update 
            ? PersistQuerySpec 
            : T extends QueryType.Delete 
                ? DeleteQuerySpec 
                : QuerySpec;
type QueryCommandResult<T extends QueryType> = 
    T extends QueryType.Find 
    ? FindQueryResult 
    : T extends QueryType.Create 
        ? CreateQueryResult 
        : T extends QueryType.Update 
            ? UpdateQueryResult 
            : T extends QueryType.Delete 
                ? DeleteQueryResult
            : void;

export interface QueryCommandProps<T extends QueryType=null> extends HttpCommandProps {
    queryType?: QueryType,
    querySpec: QueryCommandSpec<T>,
    entitiesCount?: number
    entityName?: string,
    refreshOnFilters?: false
}

export default class QueryCommand<T extends QueryType = QueryType.Find> extends HttpCommand {
    constructor(props: QueryCommandProps<T>) {
        props = {...props};
        let querySpec = props.querySpec;
        let queryType = props.queryType;
        if (!queryType) {
            if (!(<any>querySpec).fields) {
                throw new Error("queryType required unless fields are specified");
            }
            queryType = props.queryType = QueryType.Find;
        }
        let entityType = EntityType.getEntityType(querySpec.entityTypeId);
        if (!entityType.controllerUrl) {
            throw new Error(`The entityType ${entityType.id} should have a controllerUrl to query`);
        }
        props.url = entityType.controllerUrl;
        props.method = QueryCommand._getHttpMethod(props.queryType);
        if (queryType === QueryType.Find) {
            querySpec = <any>FiltersManager.adjustQuerySpec(<FindQuerySpec>querySpec, {
                component: props.component,
                refreshOnFilters: props.refreshOnFilters
            });
        } else {
            let verb, pastParticiple;
            if (queryType === QueryType.Create) {
               verb = "create";
               pastParticiple = "created";
            } else if (queryType === QueryType.Update) {
               verb = "update";
               pastParticiple = "updated";
            } else {
                verb = "delete";
                pastParticiple = "deleted"; 
            }
            let commandMessages = WebEntityUtil.getCommandMessages(entityType, {
               verb: verb,
               pastParticiple: pastParticiple,
               entitiesCount: props.entitiesCount,
               entityName: props.entityName
            });
            if (props.successMessage === undefined) {
                props.successMessage = commandMessages.successMessage;
            }
            if (props.confirmationMessage === undefined && props.queryType === QueryType.Delete) {
                props.confirmationMessage = commandMessages.confirmationMessage;
            }
        }
        props.params = {
            querySpec: querySpec
        }
        super(props);
    }
    async execute(): Promise<QueryCommandResult<T>> {
        return super.execute();
    }
    
    private static _getHttpMethod(queryType: QueryType) {
        switch (queryType) {
            case QueryType.Create: {
                return HttpCommand.Post;
            }
            case QueryType.Update: {
                return HttpCommand.Put;
            }
            case QueryType.Delete: {
                return HttpCommand.Delete;
            }
            default: {
                return HttpCommand.Get;
            }
        }
    }
}