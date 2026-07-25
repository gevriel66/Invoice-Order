const ProductModel = require('../models/ProductModel');
const CustomerModel = require('../models/CustomerModel');
const UnitModel = require('../models/UnitModel');
const OrderModel = require('../models/OrderModel');

class DashboardController {
    static showDashboard(req, res) {
        const productsCount = ProductModel.getAll().length;
        const customersCount = CustomerModel.getAll().length;
        const unitsCount = UnitModel.getAll().length;
        const orderCounts = OrderModel.getCounts();
        const recentOrders = OrderModel.getAll().slice(0, 5);

        res.render('dashboard/index', {
            activePage: 'dashboard',
            stats: {
                productsCount,
                customersCount,
                unitsCount,
                ordersTotal: orderCounts.total,
                ordersDraft: orderCounts.draft,
                ordersFinal: orderCounts.final,
                ordersCancelled: orderCounts.cancelled
            },
            recentOrders
        });
    }
}

module.exports = DashboardController;
