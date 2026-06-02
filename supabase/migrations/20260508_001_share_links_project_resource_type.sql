-- Project portal links use share_links.resource_type = 'project'.
alter type share_resource_type add value if not exists 'project';
