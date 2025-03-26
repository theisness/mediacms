import re

from django.core import validators
from django.utils.deconstruct import deconstructible
from django.utils.translation import gettext_lazy as _


@deconstructible
class ASCIIUsernameValidator(validators.RegexValidator):
    regex = r"^[\w]+$"
    message = _("Enter a valid username. This value may contain only " "Unicode letters and numbers")
    # flags = re.ASCII
    flags = re.UNICODE


custom_username_validators = [ASCIIUsernameValidator()]
