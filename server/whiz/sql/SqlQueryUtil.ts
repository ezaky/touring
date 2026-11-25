import { Query } from "../entities/Query";
import { FindQuery } from "../entities/FindQuery";
import SqlCriteriaGenerator from "./SqlCriteriaGenerator";

export default class SqlQueryUtil {
   static async getPersistCriteriaSql(query: Query): Promise<string> {
        let entityType = query.getEntityType();
        // pass the queryType so for example CommonEntitiesDataHandler doesn't add the soft deleted condition
        let findQuery = await FindQuery.instantiate({
            entityTypeId: entityType.id,
            criteria: query.getCriteria(),
            fields: []
        }, query.getContext(), {
            queryType: query.getQueryType(),
            mainTableAlias: entityType.getPersistTableName()
        });
        return new SqlCriteriaGenerator(findQuery).generate();
   }
}