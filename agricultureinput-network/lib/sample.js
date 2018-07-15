'use strict';

var productStatus = {
    ProductCreated: {code: 1,text: 'Product Created'},
    RequestApproval: {code: 2,text: 'Product Approval Requested'},
    ApproveProduct: {code: 3,text: 'Product Approved'},
    RejectProduct: {code: 4, text: 'Product Rejected'}
};

var orderStatus = {
    Created: {code: 1, text: 'Order Created'},
    Cancelled: {code: 2, text: 'Order Cancelled'},
    Accepted: {code: 3, text: 'Order Placed'},
    PayRequest: {code: 4, text: 'Payment Requested'},
    Authorize: {code: 5, text: 'Payment Approved'},
    Paid: {code: 6, text: 'Payment Processed'}
};

/**
 * @param {org.acme.agriinputnetwork.CreateProduct} creation
 * @transaction
 */
function CreateProduct(creation){
    creation.product.manufacturer = creation.manufacturer;
    creation.product.productName = creation.productName;
    creation.product.content = creation.content;
    creation.product.productType = creation.productType;
    creation.product.bestBefore = creation.bestBefore;
    creation.product.agriOrganisation = creation.agriOrganisation;
    creation.product.mrp = creation.mrp;
    creation.product.status = JSON.stringify(productStatus.ProductCreated);
    creation.product.productCreated = new Date().toISOString();
    return getAssetRegistry('org.acme.agriinputnetwork.Product')
    .then(function (assetRegistry) {
        return assetRegistry.update(creation.product);
    });
}

/**
 * @param {org.acme.agriinputnetwork.RequestApproval} creation
 * @transaction
 */
function RequestApproval(creation){

    creation.product.agriOrganisation = creation.agriOrganisation;
    creation.product.requestApproval = new Date().toISOString();
    creation.product.status = JSON.stringify(productStatus.RequestApproval);
    return getAssetRegistry('org.acme.agriinputnetwork.Product')
    .then(function (assetRegistry) {
        return assetRegistry.update(creation.product);
    });
}

/**
 * @param {org.acme.agriinputnetwork.ApproveProduct} creation
 * @transaction
 */
function ApproveProduct(creation){

    if((JSON.parse(creation.product.status).text === productStatus.RequestApproval.text)){
        creation.product.approved = creation.approved;
        creation.product.rating = creation.rating;
        creation.product.approveProduct = new Date().toISOString();
        creation.product.status = JSON.stringify(productStatus.ApproveProduct);
        return getAssetRegistry('org.acme.agriinputnetwork.Product')
        .then(function (assetRegistry) {
            return assetRegistry.update(creation.product);
        });
    }
}


/**
 * @param {org.acme.agriinputnetwork.RejectProduct} creation
 * @transaction
 */
function RejectProduct(creation){
    creation.product.approved = false;
    creation.product.rejectProduct = new Date().toISOString();
    creation.product.status = JSON.stringify(productStatus.RejectProduct);
    return getAssetRegistry('org.acme.agriinputnetwork.Product')
    .then(function (assetRegistry) {
        return assetRegistry.update(creation.product);
    });
}

/**
 * @param {org.acme.agriinputnetwork.ManufactureProduct} creation
 * @transaction
 */
function ManufactureProduct(creation){
    if(creation.product.approved){
        var _id = creation.product.productId.toString();
        _id += new Date().valueOf().toString();
        var _mfgDate = new Date().toString();
        creation.product.batches.push('{"batchId":"'+_id+'","quantity":'+creation.quantity+',"mfgDate":"'+_mfgDate+'"}');
        creation.product.totalQuantity = creation.product.totalQuantity + creation.quantity;
        return getAssetRegistry('org.acme.agriinputnetwork.Product')
        .then(function (assetRegistry) {
            return assetRegistry.update(creation.product);
        });
    }
}


/**
* @param {org.acme.agriinputnetwork.CreateOrder} purchase
* @transaction
*/
function CreateOrder(purchase) {
    purchase.order.retailer = purchase.retailer;
    purchase.order.amount = purchase.amount;
    purchase.order.created = new Date().toISOString();
    //var _items = ['{"productId":"006","quantity":150},{"productId":"007","quantity":350}'];
    purchase.order.items = purchase.items;
    purchase.order.financeCo = purchase.financeCo;
    purchase.order.manufacturer = purchase.manufacturer;
    purchase.order.status = JSON.stringify(orderStatus.Created);
    return getAssetRegistry('org.acme.agriinputnetwork.Order')
    .then(function (assetRegistry) {
        return assetRegistry.update(purchase.order);
    });
}

/**
* @param {org.acme.agriinputnetwork.CancelOrder} purchase
* @transaction
*/
function CancelOrder(purchase){
    if((purchase.order.status = JSON.stringify(orderStatus.Created) || (purchase.order.status = JSON.stringify(orderStatus.Bought)))){
        purchase.order.retailer = purchase.retailer;
        purchase.order.manufacturer = purchase.manufacturer;
        purchase.order.status = JSON.stringify(orderStatus.Cancelled);
        purchase.order.cancelled = new Date().toISOString();
        return getAssetRegistry('org.acme.agriinputnetwork.Order')
        .then(function (assetRegistry){
            assetRegistry.update(purchase.order);
        });
    }
}

/**
 * @param {org.acme.agriinputnetwork.AcceptOrder} purchase
 * @transaction
 */
function AcceptOrder(purchase){
    if(purchase.order.status === JSON.stringify(orderStatus.Created)){
        purchase.order.status = JSON.stringify(orderStatus.Accepted);
        purchase.order.manufacturer = purchase.manufacturer;
        purchase.order.accepted = new Date().toISOString();
        var i=0;
        var quantity = 0;
        var productList = [];
        return getAssetRegistry('org.acme.agriinputnetwork.Product')
        .then(function (assetRegistry){
            return query('selectProductByManufacturer',{ manufacturer: 'resource:org.acme.agriinputnetwork.Manufacturer#'+purchase.manufacturer.$identifier})
            .then(function(allProduct){

                console.log('@debug');
                console.log(allProduct);

                var temp = [];
                //Modify Product data
                while(i !== (purchase.order.items).length ){
                    var id = JSON.parse(purchase.order.items[i]).productId;
                    var newProduct = allProduct.find(function(x){
                        return x.$identifier === id;
                    });
                    var locNewProduct = allProduct.indexOf(newProduct);
                    console.log('@debug - new Product');
                    console.log(newProduct);
                    // console.log(newProduct.totalQuantity);
                    //newProduct.totalQuantity =  20;
                    quantity = JSON.parse(purchase.order.items[i]).quantity;
                    //console.log(quantity);
                    var prd = {};
                    prd.Inventory = [];
                    var manPrd = {};
                    manPrd.Quantity = 0;
                    var Batches =[];
                    if(newProduct.totalQuantity >= quantity){
                        while(quantity !== 0){
                            if(JSON.parse(newProduct.batches[0]).quantity <= quantity){
                                console.log('Reaches here');
                                quantity -= JSON.parse(newProduct.batches[0]).quantity;
                                newProduct.totalQuantity -= JSON.parse(newProduct.batches[0]).quantity;
                                var btch1 = {};
                                btch1.BatchId = JSON.parse(newProduct.batches[0]).batchId;
                                btch1.MFGDate = JSON.parse(newProduct.batches[0]).mfgDate;
                                btch1.Quantity = JSON.parse(newProduct.batches[0]).quantity;
                                btch1.OrderId = purchase.order.$identifier;
                                Batches.push((btch1));
                                btch1.ProductId = id;
                                newProduct.archive.push(JSON.stringify(btch1));
                                console.log('batch1 : ');
                                console.log(btch1);
                                newProduct.batches.shift();
                            }
                            else{
                                var jsn = JSON.parse(newProduct.batches[0]);
                                jsn.quantity -= quantity;
                                newProduct.batches[0] = JSON.stringify(jsn);
                                newProduct.totalQuantity -= quantity;
                                var btch2 = {};
                                btch2.BatchId = JSON.parse(newProduct.batches[0]).batchId;
                                btch2.MFGDate = JSON.parse(newProduct.batches[0]).mfgDate;
                                btch2.Quantity = quantity;
                                btch2.OrderId = purchase.order.$identifier;
                                Batches.push((btch2));
                                btch2.ProductId = id;
                                newProduct.archive.push(JSON.stringify(btch2));
                                // console.log(quantity);
                                console.log('batch2 : ');
                                console.log(btch2);
                                quantity = 0;
                            }
                        }
                        //String Array for Stockroom.stock
                        manPrd.Manufacturer = purchase.manufacturer;
                        manPrd.Batches = Batches;
                        manPrd.MRP = JSON.parse(purchase.order.items[i]).mrp;
                        manPrd.Quantity=0;
                        for(var f=0; f<Batches.length;f++){
                            manPrd.Quantity += Batches[0].Quantity;
                        }
                        //manPrd.Quantity = JSON.parse(purchase.order.items[i]).quantity;
                        prd.ProductName = newProduct.productName;
                        //prd.Inventory.push('' + JSON.stringify(manPrd));
                        prd.Quantity = JSON.parse(purchase.order.items[i]).quantity;
                        prd = '{"ProductName":"' + newProduct.productName + '", "Quantity":' + JSON.parse(purchase.order.items[i]).quantity + ',"Inventory":[{"Manufacturer":"'+purchase.manufacturer.$identifier + '", "Quantity":' + JSON.parse(purchase.order.items[i]).quantity+',"MRP":'+ JSON.parse(purchase.order.items[i]).mrp +', "Batches":[';
                        for(var e = 0 ; e< Batches.length;){
                            prd+='{"BatchId":"'+Batches[e].BatchId+'", "OrderId":"'+Batches[e].OrderId+'", "MFGDate":"'+Batches[e].MFGDate+'", "Quantity":'+Batches[e].Quantity+'}';
                            if(++e !== Batches.length){
                                prd+=',';
                            }
                        }
                        prd += ']}]}';
                        console.log('@debug - ');
                        console.log(prd);
                        allProduct[locNewProduct] = newProduct;
                        temp.push((prd));
                    }
                    console.log('@debug');
                    //console.log(allProduct);
                    i+=1;
                }
                return getAssetRegistry('org.acme.agriinputnetwork.Product')
                .then(function(assetRegistry){
                    return assetRegistry.updateAll(allProduct);
                })
                .then(function(){
                    return getAssetRegistry('org.acme.agriinputnetwork.Stockroom')
                    .then(function(assetRegistry){
                        return assetRegistry.getAll()
                        .then(function(stockrooms){
                            var sr = stockrooms.find(function(x) {
                                console.log('@debug '+x.retailer.$identifier.toString());
                                console.log('@debug '+purchase.retailer.toString());
                                return x.retailer.$identifier.toString() === purchase.retailer.toString().split('#')[1].split('}')[0];
                            });
                            //var serializer = getSerializer();
                            // var sr = serializer.toJSON(stk);
                            console.log('@debug - '+sr);
                            console.log(sr);
                            if(sr.stock.length > 0){
                                console.log('@debug - not here');
                                for(var i = 0 ; i< temp.length ; i++){
                                    var prd = JSON.parse(temp[i]);
                                    console.log('prd');
                                    console.log(prd);
                                    var jsonArr = [];
                                    for(var t=0;t<sr.stock.length;t++){
                                        jsonArr.push(JSON.parse(sr.stock[t]));
                                        console.log('@debug - here');
                                    }
                                    // console.log('stock length > 2 - jsonArr : ');
                                    // console.log(jsonArr);
                                    var jsonObj = jsonArr.find(function(y){
                                        // console.log('jsonarr prdName : ');
                                        console.log(y.ProductName);
                                        // console.log('prd prdName : ');
                                        console.log(prd.ProductName);
                                        return y.ProductName === prd.ProductName;
                                    });
                                    console.log(jsonObj);
                                    if(typeof(jsonObj) === 'undefined' || jsonObj === null){
                                        sr.stock.push(temp[i]);
                                        // sr.stock = [];
                                        // console.log('@debud - here happy');
                                        // for(var j=0;j<jsonArr.length;j++){
                                        //     var str = '{"ProductName":"' + jsonArr[j].productName + '", "Quantity":' + jsonArr[j].Quantity + ', "Inventory":[';
                                        //     console.log('@debud - here happy2');
                                        //     for(var f; f<jsonArr[j].Inventory.length;){
                                        //         str+= '{"Manufacturer":"'+ jsonArr[j].Inventory.Manufacturer + '", "Quantity":' + jsonArr[j].Inventory.Quantity +', "Batches":[';
                                        //         for(e = 0 ; e< jsonArr[j].Inventory.Batches.length;){
                                        //             console.log('@debud - here happy3');
                                        //             str+='{"BatchId":"'+jsonArr[j].Inventory.Batches[e].BatchId+'", "MFGDate":"'+jsonArr[j].Inventory.Batches[e].MFGDate+'", "Quantity":'+jsonArr[j].Inventory.Batches[e].Quantity+'}';
                                        //             if(++e !== jsonArr[j].Inventory.Batches.length){
                                        //                 str+=',';
                                        //             }
                                        //         }
                                        //         if(++f !== jsonArr[j].Inventory.length){
                                        //             str+='},';
                                        //         }
                                        //         else{
                                        //             str += '}]';
                                        //         }
                                        //     }
                                        //     str += '}';
                                        //     console.log('@debud - here Happy4');
                                        //     sr.stock.push(str);
                                        // }
                                    }
                                    else{
                                        console.log('json obj');
                                        console.log(jsonObj);
                                        var g = jsonArr.indexOf(jsonObj);
                                        jsonObj.Quantity += prd.Quantity;
                                        jsonObj.ProductName = prd.ProductName;
                                        // console.log('jsnObj > 1 - jsonObj.Inventory : ');
                                        // console.log(jsonObj.Inventory);
                                        var jsonSubObj = (jsonObj.Inventory).find(function(z) {
                                            console.log(z.Manufacturer);
                                            console.log(purchase.manufacturer.$identifier);
                                            return z.Manufacturer === purchase.manufacturer.$identifier;
                                        });
                                        console.log('@debud - here sad 1');
                                        if(jsonSubObj === null || typeof(jsonSubObj) === 'undefined'){
                                            // console.log('JsonSubObj > 1 - jsonSubObj : ');
                                            // console.log(jsonSubObj);
                                            //var k = jsonObj.Inventory.indexOf(jsonSubObj);
                                            jsonSubObj = {};
                                            console.log(prd);
                                            jsonSubObj.Batches = [];
                                            jsonSubObj.Manufacturer = prd.Inventory[0].Manufacturer;
                                            jsonSubObj.Quantity = 0;
                                            jsonSubObj.Quantity += prd.Inventory[0].Quantity;
                                            jsonSubObj.MRP = prd.Inventory[0].MRP;
                                            for(var q=0;q<prd.Inventory[0].Batches.length;q++){
                                                console.log('@debud - here sad 3');
                                                jsonSubObj.Batches.push(prd.Inventory[0].Batches[q]);
                                            }
                                            // jsonObj.Inventory = [];
                                            jsonObj.Inventory.push(jsonSubObj);
                                            console.log('Inventory');
                                            console.log(jsonObj.Inventory);
                                        }
                                        else{
                                            console.log('@debud - here sad 2');
                                            var p = jsonObj.Inventory.indexOf(jsonSubObj);
                                            jsonSubObj.Quantity += prd.Inventory[p].Quantity;
                                            jsonSubObj.Batches = jsonSubObj.Batches.concat(prd.Inventory[p].Batches);
                                            jsonObj.Inventory[p] = jsonSubObj;
                                        }
                                        console.log(g + ' <<g At end jsonArr');
                                        jsonArr[g] = jsonObj;
                                        console.log(jsonArr);
                                        // console.log(jsonArr);
                                        sr.stock = [];
                                        for(var j=0;j<jsonArr.length;j++){
                                            var str = '';
                                            str += '{"ProductName":"' + jsonArr[j].ProductName + '", "Quantity":' + jsonArr[j].Quantity + ', "Inventory":[';
                                            for(var f=0; f<jsonArr[j].Inventory.length ; ){
                                                console.log('@debud - here sad 4');
                                                str+= '{"Manufacturer":"'+ jsonArr[j].Inventory[f].Manufacturer + '", "Quantity":' + jsonArr[j].Inventory[f].Quantity +',"MRP":' + jsonArr[j].Inventory[f].MRP + ',"Batches":[';
                                                for(e = 0 ; e< jsonArr[j].Inventory[f].Batches.length;){
                                                    console.log('@debud - here sad 5');
                                                    str+='{"BatchId":"'+jsonArr[j].Inventory[f].Batches[e].BatchId+'", "OrderId":"'+jsonArr[j].Inventory[f].Batches[e].OrderId+'", "MFGDate":"'+jsonArr[j].Inventory[f].Batches[e].MFGDate+'", "Quantity":'+jsonArr[j].Inventory[f].Batches[e].Quantity+'}';
                                                    if(++e !== jsonArr[j].Inventory[f].Batches.length){
                                                        console.log('@debud - here sad 6');
                                                        str+=',';
                                                    }else{
                                                        str+=']}';
                                                    }
                                                }
                                                if(++f !== jsonArr[j].Inventory.length){
                                                    str+=',';
                                                }
                                                else{
                                                    str+=']}';
                                                }
                                            }
                                            console.log(str + '\n sr stock');
                                            console.log(sr.stock);
                                            sr.stock.push(str);
                                        }
                                    }
                                }
                            }
                            else{
                                // console.log('temp'+ temp.toString());
                                console.log('@debug - not here');
                                for(var m = 0 ; m< temp.length ; m++){
                                    var prdt = (temp[m]);
                                    console.log('@debug');
                                    console.log(prdt);
                                    sr.stock.push((prdt));
                                }
                                console.log('@debug - here');
                            }
                            return getAssetRegistry('org.acme.agriinputnetwork.Stockroom')
                            .then(function(assetRegistry){
                                console.log((sr));
                                return assetRegistry.update((sr));
                            });
                        });
                    });
                });
            });
        })
        .then(function(){
            return getAssetRegistry('org.acme.agriinputnetwork.Order');
        })
        .then(function(assetRegistry){
            //console.log('asdfghjkl');
            return assetRegistry.update(purchase.order);
        });
    }
}


/**
 * @param {org.acme.agriinputnetwork.RequestPayment} purchase
 * @transaction
 */
function RequestPayment(purchase){
    if ((JSON.parse(purchase.order.status).text === orderStatus.Accepted.text)){
        purchase.order.status = JSON.stringify(orderStatus.PayRequest);
        purchase.order.financeCo = purchase.financeCo;
        purchase.order.retailer = purchase.retailer;
        purchase.order.paymentRequested = new Date().toISOString();
        return getAssetRegistry('org.acme.agriinputnetwork.Order')
        .then(function (assetRegistry){
            return assetRegistry.update(purchase.order);
        });
    }
}

/**
 * @param {org.acme.agriinputnetwork.AuthorizePayment} purchase
 * @transaction
 */
function AuthorizePayment(purchase){
    if(JSON.parse(purchase.order.status).text === orderStatus.PayRequest.text || JSON.parse(purchase.order.status).text === orderStatus.Accepted.text){
        purchase.order.status = JSON.stringify(orderStatus.Authorize);
        purchase.order.approved = new Date().toISOString();
        return getAssetRegistry('org.acme.agriinputnetwork.Order')
        .then(function (assetRegistry){
            return assetRegistry.update(purchase.order);
        });
    }
}

/**
 * @param {org.acme.agriinputnetwork.Pay} purchase
 * @transaction
 */
function Pay(purchase){
    if(JSON.parse(purchase.order.status).text === orderStatus.Authorize.text){
        purchase.order.status = JSON.stringify(orderStatus.Paid);
        purchase.order.paid = new Date().toISOString();
        return getAssetRegistry('org.acme.agriinputnetwork.Order')
        .then(function (assetRegistry){
            return assetRegistry.update(purchase.order);
        });
    }
}


/**
* @param {org.acme.agriinputnetwork.CreateCustomerorder} purchase
* @transaction
*/
function CreateCustomerorder(purchase) {
    purchase.order.retailer = purchase.retailer;
    purchase.order.amount = purchase.amount;
    purchase.order.created = new Date().toISOString();
    //var _items = ['{"productId":"006","quantity":150},{"productId":"007","quantity":350}'];
    purchase.order.items = purchase.items;
    purchase.order.financeCo = purchase.financeCo;
    purchase.order.customer = purchase.customer;
    purchase.order.status = JSON.stringify(orderStatus.Created);
    return getAssetRegistry('org.acme.agriinputnetwork.Customerorder')
    .then(function (assetRegistry) {
        return assetRegistry.update(purchase.order);
    });
}

/**
* @param {org.acme.agriinputnetwork.CancelOrder} purchase
* @transaction
*/
function CancelCustomerorder(purchase){
    if((purchase.order.status = JSON.stringify(orderStatus.Created) || (purchase.order.status = JSON.stringify(orderStatus.Accepted)))){
        purchase.order.retailer = purchase.retailer;
        purchase.order.customer = purchase.customer;
        purchase.order.status = JSON.stringify(orderStatus.Cancelled);
        purchase.order.cancelled = new Date().toISOString();
        return getAssetRegistry('org.acme.agriinputnetwork.Customerorder')
        .then(function (assetRegistry){
            assetRegistry.update(purchase.order);
        });
    }
}

/**
* @param {org.acme.agriinputnetwork.AcceptCustomerorder} shop
* @transaction
*/
function AcceptCustomerorder(shop){
    if(shop.order.status === JSON.stringify(orderStatus.Created)){
        shop.order.status = JSON.stringify(orderStatus.Accepted);
        shop.order.retailer = shop.retailer;
        shop.order.accepted = new Date().toISOString();
        var quantity = 0;
        console.log('@debug');
        console.log(shop);
        return query('selectStockroomByRetailer',{ retailer: 'resource:org.acme.agriinputnetwork.Retailer#'+shop.retailer.$identifier})
        .then(function(stockroom){
            console.log('@debug');
            console.log(stockroom);
            return getAssetRegistry('org.acme.agriinputnetwork.Customerorder')
            .then(function(assetRegistry){
                console.log('@debug' + shop.order.$identifier);
                console.log(assetRegistry);
                return assetRegistry.get(shop.order.$identifier)
                .then(function(purchase0){
                    console.log('@debug2');
                    var purchase = {};
                    purchase.items = [];
                    console.log(purchase0.items);
                    for(var k = 0;k<purchase0.items.length;k++){
                        purchase.items.push(JSON.parse(purchase0.items[k]));
                    }

                    console.log(purchase.items);
                    var stock = [];
                    for(var t = 0; t<stockroom[0].stock.length;t++){
                        stock.push(JSON.parse(stockroom[0].stock[t]));
                    }
                    var stk = [];
                    var i = 0;
                    for(i = 0 ; i < purchase.items.length ; i++){
                        console.log('@debug3');
                        var product = stock.find(function(x){
                            console.log(x.ProductName);
                            console.log(purchase.items[i].ProductName);
                            console.log(purchase.items);
                            return x.ProductName === purchase.items[i].ProductName;
                        });
                        var locPrd = stock.indexOf(product);
                        if(product.Quantity >= purchase.items[i].Quantity){
                            var inventory = product.Inventory.find(function(x){
                                console.log(x);
                                console.log(x.Manufacturer);
                                console.log(purchase.items[i].Manufacturer);
                                return x.Manufacturer === purchase.items[i].Manufacturer;
                            });
                            console.log('@debug4');
                            product.Quantity -= purchase.items[i].Quantity;
                            var locInv = product.Inventory.indexOf(inventory);
                            if(inventory.Quantity >= purchase.items[i].Quantity){
                                var Product = {};
                                Product.ProductName = purchase.items[i].ProductName;
                                Product.Quantity = purchase.items[i].Quantity;
                                Product.Manufacturer = inventory.Manufacturer;
                                Product.MRP = inventory.MRP;
                                Product.Batches = [];
                                quantity = purchase.items[i].Quantity;
                                var j = 0;
                                while(quantity !== 0){
                                    if(inventory.Batches[0].Quantity > quantity){
                                        var b = [];
                                        inventory.Batches[0].Quantity -= quantity;
                                        inventory.Quantity -= quantity;
                                        b.BatchId = inventory.Batches[0].BatchId;
                                        b.Quantity = inventory.Batches[0].Quantity;
                                        b.MFGDate = inventory.Batches[0].MFGDate;
                                        b.OrderId = inventory.Batches[0].OrderId;
                                        Product.Batches.push(b);
                                        quantity = 0;
                                    }
                                    else{
                                        quantity -= inventory.Batches[0].Quantity;
                                        Product.Batches.push(inventory.Batches[0]);
                                        inventory.Quantity -= inventory.Batches[0].Quantity;
                                        inventory.Batches.shift();
                                    }
                                }
                                stk.push(Product);
                                product.Inventory[locInv] = inventory;
                                stock[locPrd] = product;
                                console.log('@debug6 - stockroom update');
                                console.log(stock);
                                stockroom[0].stock = [];
                                for(var j=0;j<stock.length;j++){
                                    var str = '';
                                    str += '{"ProductName":"' + stock[j].ProductName + '", "Quantity":' + stock[j].Quantity + ', "Inventory":[';
                                    for(var f=0; f<stock[j].Inventory.length ; ){
                                        console.log('@debud - here sad 4');
                                        str+= '{"Manufacturer":"'+ stock[j].Inventory[f].Manufacturer + '", "Quantity":' + stock[j].Inventory[f].Quantity +',"MRP":' + stock[j].Inventory[f].MRP + ',"Batches":[';
                                        for(var e = 0 ; e< stock[j].Inventory[f].Batches.length;){
                                            console.log('@debud - here sad 5');
                                            str+='{"BatchId":"'+stock[j].Inventory[f].Batches[e].BatchId+'", "OrderId":"'+stock[j].Inventory[f].Batches[e].OrderId+'", "MFGDate":"'+stock[j].Inventory[f].Batches[e].MFGDate+'", "Quantity":'+stock[j].Inventory[f].Batches[e].Quantity+'}';
                                            if(++e !== stock[j].Inventory[f].Batches.length){
                                                console.log('@debud - here sad 6');
                                                str+=',';
                                            }else{
                                                str+=']}';
                                            }
                                        }
                                        if(++f !== stock[j].Inventory.length){
                                            str+=',';
                                        }
                                        else{
                                            str+=']}';
                                        }
                                    }
                                    console.log(str + '\n sr stock');
                                    //console.log(sr.stock);
                                    stockroom[0].stock.push(str);
                                }
                                console.log('@debug 8');
                                console.log(stockroom[0].stock);
                            }
                        }
                    }
                    var str = '';
                    console.log('@debug7');
                    shop.order.items = [];
                    for(i=0;i<stk.length;i++){
                        str = '';
                        str+= '{"ProductName":"'+stk[i].ProductName+'", "Manufacturer":"'+stk[i].Manufacturer+'", "Quantity":'+stk[i].Quantity+',"MRP":'+ stk[i].MRP +', "Batches":[';
                        for(var j = 0; j<stk[i].Batches.length;){
                            str+= '{"BatchId":"'+stk[i].Batches[j].BatchId+'", "Quantity":'+stk[i].Batches[j].Quantity+', "OrderId":"'+stk[i].Batches[j].OrderId+'", "MFGDate":"'+stk[i].Batches[j].MFGDate+'"}';
                            if(++j !== stk[i].Batches.length){
                                str += ',';
                            }
                            else{
                                str+=']';
                            }
                        }
                        str+='}';
                        shop.order.items.push(str);
                    }
                    console.log('asd   ' + str);
                    return getAssetRegistry('org.acme.agriinputnetwork.Stockroom')
                    .then(function(assetRegistry){
                        console.log((stockroom));
                        return assetRegistry.updateAll(stockroom);
                    })
                    .then(function(){
                        return getAssetRegistry('org.acme.agriinputnetwork.Customerorder')
                        .then(function(assetRegistry){
                            //console.log('asdfghjkl');
                            return assetRegistry.update(shop.order);
                        });
                    });
                });
            });
        });
    }
}

/**
 * @param {org.acme.agriinputnetwork.RequestCustomerPayment} purchase
 * @transaction
 */
function RequestCustomerPayment(purchase){
    if ((JSON.parse(purchase.order.status).text === orderStatus.Accepted.text)){
        purchase.order.status = JSON.stringify(orderStatus.PayRequest);
        purchase.order.financeCo = purchase.financeCo;
        purchase.order.retailer = purchase.retailer;
        purchase.order.paymentRequested = new Date().toISOString();
        return getAssetRegistry('org.acme.agriinputnetwork.Customerorder')
        .then(function (assetRegistry){
            return assetRegistry.update(purchase.order);
        });
    }
}

/**
 * @param {org.acme.agriinputnetwork.AuthorizeRetailerPayment} purchase
 * @transaction
 */
function AuthorizeRetailerPayment(purchase){
    if(JSON.parse(purchase.order.status).text === orderStatus.PayRequest.text || JSON.parse(purchase.order.status).text === orderStatus.Accepted.text){
        purchase.order.status = JSON.stringify(orderStatus.Authorize);
        purchase.order.approved = new Date().toISOString();
        purchase.order.customer = purchase.customer;
        return getAssetRegistry('org.acme.agriinputnetwork.Customerorder')
        .then(function (assetRegistry){
            return assetRegistry.update(purchase.order);
        });
    }
}

/**
 * @param {org.acme.agriinputnetwork.PayRetailer} purchase
 * @transaction
 */
function PayRetailer(purchase){
    if(JSON.parse(purchase.order.status).text === orderStatus.Authorize.text){
        purchase.order.status = JSON.stringify(orderStatus.Paid);
        purchase.order.paid = new Date().toISOString();
        purchase.order.retailer = purchase.retailer;
        return getAssetRegistry('org.acme.agriinputnetwork.Order')
        .then(function (assetRegistry){
            return assetRegistry.update(purchase.order);
        });
    }
}