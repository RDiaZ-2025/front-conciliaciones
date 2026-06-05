export * from './User';
export * from './Permission';
export * from './PermissionByUser';
export * from './Notification';
export * from './CustomerData';
export * from './CampaignDetail';
export * from './AudienceData';
export * from './FormatType';
export * from './RightsDuration';
export * from './ProductionInfo';
export * from './ProductionRequest';
export * from './ProductionRequestHistory';
export * from './Product';
export * from './CampaignProduct';
export * from './Objective';
export * from './Campaign';
export * from './MaterialRegister';
export * from './ModuleState';
export * from './DashboardData';
export * from './Entity';
export * from './Presupuesto';
export * from './IngresoPortal';
export * from './IngresoRedes';
export * from './PrecioDolar';

export { MenuItem } from './MenuItem';
export { UserActionLog } from './UserActionLog';
export { Cover15Minute } from './Cover15Minute';
export { Team } from './Team';

import { User } from './User';
import { Permission } from './Permission';
import { PermissionByUser } from './PermissionByUser';
import { Notification } from './Notification';
import { CustomerData } from './CustomerData';
import { CampaignDetail } from './CampaignDetail';
import { AudienceData } from './AudienceData';
import { ProductionInfo } from './ProductionInfo';
import { MenuItem } from './MenuItem';
import { ProductionRequest } from './ProductionRequest';
import { UserActionLog } from './UserActionLog';
import { Cover15Minute } from './Cover15Minute';
import { Team } from './Team';
import { Product } from './Product';
import { CampaignProduct } from './CampaignProduct';
import { ProductionRequestHistory } from './ProductionRequestHistory';
import { Objective } from './Objective';
import { Gender } from './Gender';
import { AgeRange } from './AgeRange';
import { SocioeconomicLevel } from './SocioeconomicLevel';
import { FormatType } from './FormatType';
import { RightsDuration } from './RightsDuration';

import { Campaign } from './Campaign';
import { MaterialRegister } from './MaterialRegister';

import { ModuleState } from './ModuleState';
import { DashboardData } from './DashboardData';
import { DashboardEntity } from './Entity';
import { Presupuesto } from './Presupuesto';
import { IngresoPortal } from './IngresoPortal';
import { IngresoRedes } from './IngresoRedes';
import { PrecioDolar } from './PrecioDolar';

export const entities = [
  User,
  Permission,
  PermissionByUser,
  Notification,
  CustomerData,
  CampaignDetail,
  AudienceData,
  ProductionInfo,
  MenuItem,
  ProductionRequest,
  ProductionRequestHistory,
  UserActionLog,
  Cover15Minute,
  Team,
  Product,
  CampaignProduct,
  Campaign,
  Objective,
  Gender,
  AgeRange,
  SocioeconomicLevel,
  FormatType,
  RightsDuration,
  MaterialRegister,
  ModuleState,
  DashboardData,
  DashboardEntity,
  Presupuesto,
  IngresoPortal,
  IngresoRedes,
  PrecioDolar
];

export const ModelCategories = {
  Auth: {
    User,
    Permission,
    PermissionByUser,
    Notification
  },

  /**
   * Menu and navigation models
   */
  Menu: {
    MenuItem
  },

  /**
   * Production management models
   */
  Production: {
    ProductionRequest,
    ProductionRequestHistory,
    CustomerData,
    CampaignDetail,
    AudienceData,
    ProductionInfo,
    Campaign
  },

  /**
   * Cover 15 Minute models
   */
  Covers: {
    Cover15Minute
  },

  /**
   * Audit and logging models
   */
  Audit: {
    UserActionLog
  },

  /**
   * Team management models
   */
  Team: {
    Team
  }
};
