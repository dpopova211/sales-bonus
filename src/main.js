/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {

   const { discount, sale_price, quantity } = purchase;
   
   const decimalDiscount = discount / 100;

   return sale_price * quantity * (1 - decimalDiscount);
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {

    const { profit } = seller;

    let bonusPercentage = 0;

    if (index === 0) {
        bonusPercentage = 0.15;
    } else if (index === 1 || index === 2) {
        bonusPercentage = 0.10;
    } else if (index < total - 1) {
        bonusPercentage = 0.05; 
    }

    return profit * bonusPercentage;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {

      if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    if (!options || typeof options !== 'object') {
        throw new Error('Опции обязательны');
    }

    const { calculateRevenue, calculateBonus } = options;
    
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Не все необходимые функции предоставлены');
    }

    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    const sellerIndex = Object.fromEntries(
        sellerStats.map(seller => [seller.id, seller])
    );

    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );

    data.purchase_records.forEach(record => {

        const seller = sellerIndex[record.seller_id];
        
        if (!seller) {
            return;
        }

        seller.sales_count += 1;
        
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            
            if (!product) {
                return;
            }

            const revenue = calculateRevenue(item, product);
            seller.revenue += revenue;
            
            const cost = product.purchase_price * item.quantity;
            
            const profit = revenue - cost;
            seller.profit += profit;
            
            if (!seller.products_sold[item.sku]) {
            seller.products_sold[item.sku] = 0;
            }

            seller.products_sold[item.sku] += item.quantity;
        });
    });

    sellerStats.sort((a, b) => b.profit - a.profit);

    const totalSellers = sellerStats.length;

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, totalSellers, seller);
        
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}
