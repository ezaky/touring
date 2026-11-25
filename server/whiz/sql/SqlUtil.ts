export default class SqlUtil {
   static getSingleValue(result) {
      if (!result || !result.length) {
         return null;
      }
      result = result[0];
      for (let key in result) {
         return result[key];
      }
   }
}