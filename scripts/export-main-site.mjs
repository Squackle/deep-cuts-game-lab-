/** The standalone Hive Run repository is now an isolated, solo development lab.
 * The live main-site arcade has its own client, shared identity and ranking API.
 * Deliberately forbid bulk-copying test assets, which would disable production rankings.
 */
throw Error("Solo Game Lab cannot overwrite public Hive Run. Selectively merge tested gameplay changes in Squackle/deep-cuts-edh.");
