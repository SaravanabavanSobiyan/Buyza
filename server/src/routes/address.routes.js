import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createAddressSchema, updateAddressSchema } from "../validators/address.validators.js";
import {
  listAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} from "../controllers/address.controller.js";

const router = Router();

router.use(protect);

router.get("/", listAddresses);
router.post("/", validate(createAddressSchema), createAddress);
router.patch("/:id", validate(updateAddressSchema), updateAddress);
router.patch("/:id/default", setDefaultAddress);
router.delete("/:id", deleteAddress);

export default router;
