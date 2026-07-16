def get_pagination_args(args: dict) -> dict:
    return {
        "page": max(int(args.get("page", 1)), 1),
        "per_page": min(max(int(args.get("per_page", 10)), 1), 100),
        "search": args.get("search"),
        "sort": args.get("sort", "id"),
        "order": args.get("order", "asc"),
    }


def paginate_response(pagination, mapper=lambda item: item.to_dict()) -> dict:
    return {
        "items": list(map(mapper, pagination.items)),
        "total": pagination.total,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "pages": pagination.pages,
    }
