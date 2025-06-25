import React from 'react';
import PropTypes from 'prop-types';
import { useManagementTableHeader } from '../../../utils/hooks/';
import { MaterialIcon } from '../../_shared/material-icon/MaterialIcon';

export function ManageUsersItemHeader(props) {
  const [sort, order, isSelected, sortByColumn, checkAll] = useManagementTableHeader({ ...props, type: 'users' });

  return (
    <div className="item manage-item manage-item-header manage-users-item">
      <div className="mi-checkbox">
        <input type="checkbox" checked={isSelected} onChange={checkAll} />
      </div>
      <div
        id="name"
        onClick={sortByColumn}
        className={'mi-name mi-col-sort' + ('name' === sort ? ('asc' === order ? ' asc' : ' desc') : '')}
      >
        昵称
        <div className="mi-col-sort-icons">
          <span>
            <MaterialIcon type="arrow_drop_up" />
          </span>
          <span>
            <MaterialIcon type="arrow_drop_down" />
          </span>
        </div>
      </div>
      <div className="mi-username">用户名</div>
      <div
        id="add_date"
        onClick={sortByColumn}
        className={'mi-added mi-col-sort' + ('add_date' === sort ? ('asc' === order ? ' asc' : ' desc') : '')}
      >
        注册日期
        <div className="mi-col-sort-icons">
          <span>
            <MaterialIcon type="arrow_drop_up" />
          </span>
          <span>
            <MaterialIcon type="arrow_drop_down" />
          </span>
        </div>
      </div>
      {props.has_roles ? <div className="mi-role">角色</div> : null}
      {props.has_verified ? <div className="mi-verified">已验证</div> : null}
      {props.has_trusted ? <div className="mi-trusted">已信任</div> : null}
      <div className="mi-featured">已精选</div>
    </div>
  );
}

ManageUsersItemHeader.propTypes = {
  sort: PropTypes.string.isRequired,
  order: PropTypes.string.isRequired,
  selected: PropTypes.bool.isRequired,
  onClickColumnSort: PropTypes.func,
  onCheckAllRows: PropTypes.func,
  has_roles: PropTypes.bool,
  has_verified: PropTypes.bool,
  has_trusted: PropTypes.bool,
};

ManageUsersItemHeader.defaultProps = {
  has_roles: false,
  has_verified: false,
  has_trusted: false,
};
