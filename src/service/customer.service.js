import crypto from "crypto";
import { Op } from "sequelize";
import { Customer, CustomerMetadata, CustomerPaymentMethod } from "../models/index.js";

const generateCustomerCode = () => {
  const random = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `CUS_${random}`;
};

const buildCustomerInclude = () => [
  {
    model: CustomerMetadata,
    as: "metadata",
  },
  {
    model: CustomerPaymentMethod,
    as: "paymentMethods",
  },
];

export const createCustomer = async ({ merchantId, payload }) => {
  const normalizedEmail = payload.email.trim().toLowerCase();

  const duplicateCustomer = await Customer.findOne({
    where: {
      merchantId,
      email: normalizedEmail,
    },
  });

  if (duplicateCustomer) {
    const error = new Error("A customer with this email already exists for this merchant");
    error.statusCode = 409;
    throw error;
  }

  let customerCode = generateCustomerCode();
  let exists = await Customer.findOne({ where: { customerCode } });

  while (exists) {
    customerCode = generateCustomerCode();
    exists = await Customer.findOne({ where: { customerCode } });
  }

  const customer = await Customer.create({
    merchantId,
    customerCode,
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    email: normalizedEmail,
    phone: payload.phone ? payload.phone.trim() : null,
    status: payload.status || "ACTIVE",
  });

  if (payload.metadata && typeof payload.metadata === "object" && Object.keys(payload.metadata).length > 0) {
    await CustomerMetadata.create({
      customerId: customer.id,
      metadata: payload.metadata,
    });
  }

  return Customer.findByPk(customer.id, {
    include: buildCustomerInclude(),
  });
};

export const getCustomers = async ({ merchantId, page = 1, limit = 20, search, status }) => {
  const safePage = Number(page) || 1;
  const safeLimit = Number(limit) || 20;
  const maxLimit = Math.min(safeLimit, 100);
  const offset = (safePage - 1) * maxLimit;

  const where = { merchantId };

  if (status) {
    where.status = status;
  }

  if (search) {
    const keyword = search.trim();
    where[Op.or] = [
      { firstName: { [Op.like]: `%${keyword}%` } },
      { lastName: { [Op.like]: `%${keyword}%` } },
      { email: { [Op.like]: `%${keyword}%` } },
      { customerCode: { [Op.like]: `%${keyword}%` } },
    ];
  }

  const { count, rows } = await Customer.findAndCountAll({
    where,
    include: buildCustomerInclude(),
    order: [["createdAt", "DESC"]],
    limit: maxLimit,
    offset,
  });

  return {
    customers: rows,
    pagination: {
      total: count,
      page: safePage,
      limit: maxLimit,
      pages: Math.ceil(count / maxLimit) || 1,
    },
  };
};

export const getCustomerById = async ({ merchantId, customerId }) => {
  const customer = await Customer.findOne({
    where: {
      id: customerId,
      merchantId,
    },
    include: buildCustomerInclude(),
  });

  if (!customer) {
    const error = new Error("Customer not found");
    error.statusCode = 404;
    throw error;
  }

  return customer;
};

export const updateCustomer = async ({ merchantId, customerId, payload }) => {
  const customer = await Customer.findOne({
    where: {
      id: customerId,
      merchantId,
    },
  });

  if (!customer) {
    const error = new Error("Customer not found");
    error.statusCode = 404;
    throw error;
  }

  if (payload.email) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const duplicateCustomer = await Customer.findOne({
      where: {
        merchantId,
        email: normalizedEmail,
        id: { [Op.ne]: customerId },
      },
    });

    if (duplicateCustomer) {
      const error = new Error("A customer with this email already exists for this merchant");
      error.statusCode = 409;
      throw error;
    }
  }

  const updateData = {};

  if (payload.firstName) updateData.firstName = payload.firstName.trim();
  if (payload.lastName) updateData.lastName = payload.lastName.trim();
  if (payload.email) updateData.email = payload.email.trim().toLowerCase();
  if (payload.phone !== undefined) updateData.phone = payload.phone ? payload.phone.trim() : null;
  if (payload.status) updateData.status = payload.status;

  if (Object.keys(updateData).length > 0) {
    await customer.update(updateData);
  }

  if (payload.metadata && typeof payload.metadata === "object") {
    const existingMetadata = await CustomerMetadata.findOne({
      where: { customerId },
    });

    if (existingMetadata) {
      await existingMetadata.update({ metadata: payload.metadata });
    } else {
      await CustomerMetadata.create({
        customerId,
        metadata: payload.metadata,
      });
    }
  }

  return getCustomerById({ merchantId, customerId });
};

export const deleteCustomer = async ({ merchantId, customerId }) => {
  const customer = await Customer.findOne({
    where: {
      id: customerId,
      merchantId,
    },
  });

  if (!customer) {
    const error = new Error("Customer not found");
    error.statusCode = 404;
    throw error;
  }

  await customer.destroy();

  return {
    id: customer.id,
    merchantId: customer.merchantId,
    deleted: true,
  };
};
