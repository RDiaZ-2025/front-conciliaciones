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

export { LoadDocumentsOCbyUser } from './LoadDocumentsOCbyUser';
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
import { LoadDocumentsOCbyUser } from './LoadDocumentsOCbyUser';
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
import { Status } from './Status';

export const entities = [
  User,
  Permission,
  PermissionByUser,
  Notification,
  CustomerData,
  CampaignDetail,
  AudienceData,
  ProductionInfo,
  LoadDocumentsOCbyUser,
  MenuItem,
  ProductionRequest,
  ProductionRequestHistory,
  UserActionLog,
  Cover15Minute,
  Team,
  Product,
  CampaignProduct,
  Objective,
  Gender,
  AgeRange,
  SocioeconomicLevel,
  FormatType,
  RightsDuration,
  Status
];

export const ModelCategories = {
  Auth: {
    User,
    Permission,
    PermissionByUser,
    Notification
  },

  Documents: {
    LoadDocumentsOCbyUser
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
    ProductionInfo
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
