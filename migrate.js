const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

const client = new MongoClient(process.env.npm_package_config_mongodb_url, {useUnifiedTopology: true});

client.connect(function (err) {
    assert.equal(null, err);

    const db = client.db(process.env.npm_package_config_dbName);

    const blockAssetColl = db.collection('blockAsset');
    const blockAssetPromise = blockAssetColl.drop().catch(_ => {}).finally(_ => {
        return Promise.all([
            blockAssetColl.createIndexes([
                {key: {Block_ID: 1}, unique: true},
                {key: {Block_Type: 1}}
            ])
            ,
            blockAssetColl.insertMany([
                {Block_ID: "A", Block_Type: "triangle"},
                {Block_ID: "B", Block_Type: "square"},
                {Block_ID: "C", Block_Type: "circle"},
                {Block_ID: "D", Block_Type: "trapeze"},
                {Block_ID: "E", Block_Type: "rhomb"},
            ])
        ]);
    });

    const blockRepositoryColl = db.collection('blockRepository');
    const blockRepositoryPromise = blockRepositoryColl.drop().catch(_ => {}).finally(_ => {
        return Promise.all([
            blockRepositoryColl.createIndexes([
                {key: {Block_Ref_ID: 1}, unique: true},
                {key: {Block_Type: 1}},
            ])
            ,
            blockRepositoryColl.insertMany([
                {Block_Ref_ID: "A1", Block_Type: "triangle"},
                {Block_Ref_ID: "A2", Block_Type: "triangle"},
                {Block_Ref_ID: "A3", Block_Type: "triangle"},
                {Block_Ref_ID: "C1", Block_Type: "circle"},
                {Block_Ref_ID: "E1", Block_Type: "rhomb"},
                {Block_Ref_ID: "B1", Block_Type: "square"},
            ])
        ]);
    });

    Promise.all([
        blockAssetPromise,
        blockRepositoryPromise,
    ]).then(_ => {
        client.close();
        process.exit(0);
    });
});