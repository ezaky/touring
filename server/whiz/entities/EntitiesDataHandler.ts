import { CreateQueryResult, DeleteQueryResult, FindQueryResult, GenerateColumnFunc, UpdateQueryResult, Criteria } from "shared/whiz/entities/QueryDefs";
import { FindQuery } from "./FindQuery";
import { DeleteQuery, PersistQuery } from "./Query";

export default class EntitiesDataHandler {
    async preFind(query: FindQuery) {
    }
    async postFind(result: FindQueryResult, query: FindQuery) {
    }
    /**
     * @returns The criteria added to JOIN ON when the specified entity type is on the right side of the join
     */
    getJoinCriteria(query: FindQuery, entityTypeId: string): Criteria {
        return null;
    }
    getColumnGenerators(): {[fieldName: string]: GenerateColumnFunc} {
        return null;
    }
    async preCreate(query: PersistQuery) {
    }
    async postCreate(result: CreateQueryResult, query: PersistQuery) {
    }
    async preUpdate(query: PersistQuery) {
    }
    async postUpdate(result: UpdateQueryResult, query: PersistQuery) {
    }
    async preDelete(query: DeleteQuery) {
    }
    async postDelete(result: DeleteQueryResult, query: DeleteQuery) {
    }
}