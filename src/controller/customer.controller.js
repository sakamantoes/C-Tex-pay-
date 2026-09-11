import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "../service/customer.service.js";

export const createCustomerController = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const customer = await createCustomer({
      merchantId,
      payload: req.body,
    });

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: {
        customer,
      },
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Create customer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create customer",
    });
  }
};

export const getCustomersController = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const result = await getCustomers({
      merchantId,
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      status: req.query.status,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get customers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get customers",
    });
  }
};

export const getCustomerController = async (req, res) => {
  try {
    const customer = await getCustomerById({
      merchantId: req.merchant.id,
      customerId: req.params.id,
    });

    return res.status(200).json({
      success: true,
      data: {
        customer,
      },
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    console.error("Get customer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get customer",
    });
  }
};

export const updateCustomerController = async (req, res) => {
  try {
    const customer = await updateCustomer({
      merchantId: req.merchant.id,
      customerId: req.params.id,
      payload: req.body,
    });

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: {
        customer,
      },
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (error.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Update customer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update customer",
    });
  }
};

export const deleteCustomerController = async (req, res) => {
  try {
    const result = await deleteCustomer({
      merchantId: req.merchant.id,
      customerId: req.params.id,
    });

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
      data: result,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    console.error("Delete customer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete customer",
    });
  }
};
